import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import { createStore } from "./src/store.mjs";
import { createMediaStore } from "./src/media.mjs";
import { createSecurity, securityHeaders } from "./src/security.mjs";
import { createBackup, parseBackup } from "./src/backup.mjs";
import { mediaIdsInRichText, sanitizeRichText } from "./src/rich-text.mjs";
import { aboutPage, adminPage, articlePage, contactPage, errorPage, homePage, loginPage, setPublicOrigin } from "./src/templates.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const production = process.env.NODE_ENV === "production";
const fontDirectory = production ? join(here, "fonts") : join(here, "assets/fonts");
const port = numberEnv("PORT", 3000, 1, 65535);
const appOrigin = normalizeOrigin(process.env.APP_ORIGIN || `http://localhost:${port}`);
const sessionTtlSeconds = numberEnv("SESSION_TTL_SECONDS", 28800, 900, 86400);
const sessionSecret = process.env.SESSION_SECRET || (production ? "" : randomBytes(48).toString("base64url"));
const oauthConfigured = Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
const allowedUsers = new Set(splitEnv("GITHUB_ALLOWED_USERS").map((value) => value.toLowerCase()));
const allowedIds = new Set(splitEnv("GITHUB_ALLOWED_IDS"));
setPublicOrigin(appOrigin);

if (sessionSecret.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters");
if (production && !process.env.APP_ORIGIN) throw new Error("APP_ORIGIN is required in production");
if (production && !oauthConfigured) throw new Error("GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are required in production");
if (production && allowedUsers.size === 0 && allowedIds.size === 0) throw new Error("Set GITHUB_ALLOWED_USERS or GITHUB_ALLOWED_IDS before starting in production");

const store = createStore(process.env.DATA_FILE || "./data/content.json");
await store.init();
const mediaStore = createMediaStore(join(dirname(store.path), "uploads"));
await mediaStore.init();
const security = createSecurity({ secret: sessionSecret, production, sessionTtlSeconds });
const headers = securityHeaders({ production, csp: "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: https://avatars.githubusercontent.com; style-src 'self'; script-src 'self'; connect-src 'self'; font-src 'self'" });
const rateBuckets = new Map();

const server = createServer(async (request, response) => {
  try {
    for (const [name, value] of Object.entries(headers)) response.setHeader(name, value);
    const url = new URL(request.url, appOrigin);
    const method = request.method || "GET";
    const readMethod = method === "GET" || method === "HEAD";
    response.headOnly = method === "HEAD";

    if (readMethod && url.pathname === "/styles.css") return sendStatic(response, join(here, "public/styles.css"), "text/css; charset=utf-8");
    if (readMethod && url.pathname === "/admin-editor.css") return sendStatic(response, join(here, "public/admin-editor.css"), "text/css; charset=utf-8", 86400);
    if (readMethod && url.pathname === "/admin-editor.js") return sendStatic(response, join(here, "public/admin-editor.js"), "text/javascript; charset=utf-8", 86400);
    if (readMethod && /^\/editor-assets\/[A-Za-z0-9_-]+\.(woff2|woff|ttf)$/.test(url.pathname)) return sendStatic(response, join(here, "public", url.pathname), url.pathname.endsWith(".woff2") ? "font/woff2" : url.pathname.endsWith(".woff") ? "font/woff" : "font/ttf", 604800);
    if (readMethod && url.pathname === "/robots.txt") return sendStatic(response, join(here, "public/robots.txt"), "text/plain; charset=utf-8");
    if (readMethod && url.pathname === "/og.png") return sendStatic(response, join(here, "public/og.png"), "image/png", 86400);
    if (readMethod && ["/assets/IBMPlexMono-Regular.otf", "/assets/IBMPlexMono-Medium.otf", "/assets/IBMPlexMono-Bold.otf"].includes(url.pathname)) return sendStatic(response, join(fontDirectory, url.pathname.slice("/assets/".length)), "font/otf", 604800);
    if (readMethod && url.pathname === "/healthz") return sendJson(response, 200, { status: "ok" });
    if (readMethod && url.pathname.startsWith("/media/")) {
      const id = url.pathname.slice(7);
      const media = (store.read().media || []).find((item) => item.id === id);
      if (!media) return sendHtml(response, 404, errorPage(404, "Image not found"));
      const image = await mediaStore.read(media.filename);
      return image ? sendBinary(response, 200, image, media.mime, 86400) : sendHtml(response, 404, errorPage(404, "Image file not found"));
    }
    if (readMethod && url.pathname.startsWith("/attachments/")) {
      const id = url.pathname.slice(13);
      const attachment = (store.read().attachments || []).find((item) => item.id === id);
      if (!attachment) return sendHtml(response, 404, errorPage(404, "PDF attachment not found"));
      const document = await mediaStore.read(attachment.filename);
      return document ? sendDownload(response, document, attachment) : sendHtml(response, 404, errorPage(404, "PDF file not found"));
    }
    if (readMethod && url.pathname === "/") return sendHtml(response, 200, homePage(store.read()), false);
    if (readMethod && url.pathname === "/about") return sendHtml(response, 200, aboutPage(store.read()), false);
    if (readMethod && url.pathname === "/contact") return sendHtml(response, 200, contactPage(store.read()), false);
    if (readMethod && url.pathname.startsWith("/article-content/")) {
      const id = decodeURIComponent(url.pathname.slice(17));
      const article = store.read().articles.find((item) => item.id === id && item.embed);
      return article ? sendArticleEmbed(response, article) : sendHtml(response, 404, errorPage(404, "Custom article content not found"));
    }
    if (readMethod && url.pathname.startsWith("/articles/")) {
      const id = decodeURIComponent(url.pathname.slice(10));
      const data = store.read();
      const article = data.articles.find((item) => item.id === id);
      return article ? sendHtml(response, 200, articlePage(data, article), false) : sendHtml(response, 404, errorPage(404, "Article not found"));
    }

    if (readMethod && url.pathname === "/admin") {
      const user = security.readSession(request);
      if (!user) return sendHtml(response, 200, loginPage(oauthConfigured), true);
      const section = ["profile", "articles", "experience", "education"].includes(url.searchParams.get("section")) ? url.searchParams.get("section") : "profile";
      const notice = { saved: "Changes saved and published.", deleted: "Entry deleted.", restored: "Backup restored and published." }[url.searchParams.get("notice")] || "";
      return sendHtml(response, 200, adminPage({ data: store.read(), user, section, editId: cleanId(url.searchParams.get("edit") || ""), csrfToken: user.csrf, notice }), true);
    }

    if (readMethod && url.pathname === "/admin/backup") {
      const user = security.readSession(request);
      if (!user) return sendHtml(response, 401, errorPage(401, "Sign in required"), true);
      return sendBackup(response, createBackup(store.read()));
    }

    if (method === "GET" && url.pathname === "/auth/github") {
      if (!oauthConfigured) return sendHtml(response, 503, errorPage(503, "GitHub authentication is not configured"), true);
      if (!rateLimit(request, "oauth", 20, 600)) return sendHtml(response, 429, errorPage(429, "Too many sign-in attempts"), true);
      const { state, token } = security.createOAuthState();
      response.setHeader("Set-Cookie", security.cookie(security.cookieNames.oauth, token, { maxAge: 600 }));
      const authorize = new URL("https://github.com/login/oauth/authorize");
      authorize.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID);
      authorize.searchParams.set("redirect_uri", `${appOrigin}/auth/github/callback`);
      authorize.searchParams.set("state", state);
      authorize.searchParams.set("allow_signup", "false");
      return redirect(response, authorize.toString());
    }

    if (method === "GET" && url.pathname === "/auth/github/callback") {
      response.setHeader("Set-Cookie", security.clearCookie(security.cookieNames.oauth));
      if (!rateLimit(request, "callback", 30, 600)) return sendHtml(response, 429, errorPage(429, "Too many sign-in attempts"), true);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (!code || code.length > 512 || !security.verifyOAuthState(request, state)) return sendHtml(response, 400, errorPage(400, "Invalid or expired GitHub sign-in"), true);
      const user = await exchangeGitHubCode(code);
      if (!allowedUsers.has(user.login.toLowerCase()) && !allowedIds.has(String(user.id))) return sendHtml(response, 403, errorPage(403, "This GitHub account is not authorized"), true);
      const created = security.createSession(user);
      response.setHeader("Set-Cookie", security.cookie(security.cookieNames.session, created.token, { maxAge: sessionTtlSeconds }));
      return redirect(response, "/admin");
    }

    if (method === "POST" && url.pathname === "/auth/logout") {
      const user = security.readSession(request);
      if (!user || !sameOrigin(request)) return sendHtml(response, 403, errorPage(403, "Invalid sign-out request"), true);
      const form = await readForm(request);
      if (!security.safeEqual(form.get("csrf") || "", user.csrf)) return sendHtml(response, 403, errorPage(403, "Invalid request token"), true);
      response.setHeader("Set-Cookie", security.clearCookie(security.cookieNames.session));
      return redirect(response, "/admin");
    }

    if (method === "POST" && url.pathname.startsWith("/admin/")) {
      const user = security.readSession(request);
      if (!user) return sendHtml(response, 401, errorPage(401, "Sign in required"), true);
      if (!sameOrigin(request)) return sendHtml(response, 403, errorPage(403, "Cross-site request rejected"), true);
      if (!rateLimit(request, "write", 120, 60)) return sendHtml(response, 429, errorPage(429, "Too many changes; try again shortly"), true);
      if (url.pathname === "/admin/restore") {
        const upload = await readBackupUpload(request);
        if (!security.safeEqual(upload.fields.get("csrf") || "", user.csrf)) return sendHtml(response, 403, errorPage(403, "Invalid request token"), true);
        if (upload.fields.get("replace") !== "yes") throw publicError(400, "Confirm that the restore replaces current data");
        let restored;
        try { restored = parseBackup(upload.file.toString("utf8")); } catch (error) { throw publicError(400, error.message); }
        await store.replace(restored);
        return redirect(response, "/admin?section=profile&notice=restored");
      }
      if (url.pathname === "/admin/media/upload") {
        const upload = await readImageUpload(request);
        if (!security.safeEqual(upload.fields.get("csrf") || "", user.csrf)) return sendHtml(response, 403, errorPage(403, "Invalid request token"), true);
        let record;
        try { record = await mediaStore.save(upload.file, ["png", "jpg", "gif", "webp"]); } catch (error) { throw publicError(400, error.message); }
        record.alt = text(upload.fields, "alt", 300);
        await store.update((data) => { (data.media ||= []).unshift(record); });
        const articleId = cleanId(upload.fields.get("articleId") || "");
        return redirect(response, articleId ? `/admin?section=articles&edit=${encodeURIComponent(articleId)}&notice=saved` : "/admin?section=articles&notice=saved");
      }
      if (url.pathname === "/admin/attachments/upload") {
        const upload = await readPdfUpload(request);
        if (!security.safeEqual(upload.fields.get("csrf") || "", user.csrf)) return sendHtml(response, 403, errorPage(403, "Invalid request token"), true);
        const articleId = cleanId(upload.fields.get("articleId") || "");
        if (!articleId || !store.read().articles.some((article) => article.id === articleId)) throw publicError(400, "Save the article before attaching a PDF");
        let record;
        try { record = await mediaStore.save(upload.file, ["pdf"]); } catch (error) { throw publicError(400, error.message); }
        const attachment = { ...record, articleId, title: required(upload.fields, "title", 240) };
        await store.update((data) => { (data.attachments ||= []).unshift(attachment); });
        return redirect(response, `/admin?section=articles&edit=${encodeURIComponent(articleId)}&notice=saved`);
      }
      const form = await readForm(request);
      if (!security.safeEqual(form.get("csrf") || "", user.csrf)) return sendHtml(response, 403, errorPage(403, "Invalid request token"), true);
      await handleAdminWrite(url.pathname, form);
      const section = url.pathname.includes("articles") ? "articles" : url.pathname.includes("experience") ? "experience" : url.pathname.includes("education") ? "education" : "profile";
      return redirect(response, `/admin?section=${section}&notice=${url.pathname.endsWith("/delete") ? "deleted" : "saved"}`);
    }

    if (!["GET", "HEAD", "POST"].includes(method)) {
      response.setHeader("Allow", "GET, HEAD, POST");
      return sendHtml(response, 405, errorPage(405, "Method not allowed"));
    }
    return sendHtml(response, 404, errorPage(404, "Page not found"));
  } catch (error) {
    console.error(error);
    if (!response.headersSent) sendHtml(response, error.status || 500, errorPage(error.status || 500, error.expose ? error.message : "Something went wrong"), true);
    else response.destroy();
  }
});

async function exchangeGitHubCode(code) {
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": "lorenzo-pulcini-portfolio" },
    body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code, redirect_uri: `${appOrigin}/auth/github/callback` }),
    signal: AbortSignal.timeout(10000)
  });
  const tokenPayload = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenPayload.access_token) throw publicError(502, "GitHub sign-in could not be completed");
  const userResponse = await fetch("https://api.github.com/user", { headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${tokenPayload.access_token}`, "X-GitHub-Api-Version": "2026-03-10", "User-Agent": "lorenzo-pulcini-portfolio" }, signal: AbortSignal.timeout(10000) });
  const user = await userResponse.json();
  if (!userResponse.ok || !user.id || !user.login) throw publicError(502, "GitHub identity could not be verified");
  return user;
}

async function handleAdminWrite(path, form) {
  if (path === "/admin/profile") {
    const profile = {
      name: required(form, "name", 120), availability: text(form, "availability", 200), eyebrow: text(form, "eyebrow", 240), headline: required(form, "headline", 300), intro: required(form, "intro", 1200), about: required(form, "about", 4000), email: email(form, "email"), phone: text(form, "phone", 100), location: text(form, "location", 200), linkedin: httpUrl(form, "linkedin"), github: httpUrl(form, "github")
    };
    return store.update((data) => { data.profile = profile; });
  }
  const match = /^\/admin\/(articles|experience|education)\/(save|delete)$/.exec(path);
  if (!match) throw publicError(404, "Admin action not found");
  const [, section, action] = match;
  const key = section === "articles" ? "articles" : section === "experience" ? "experiences" : "education";
  const id = cleanId(form.get("id") || "");
  if (action === "delete") {
    if (!id) throw publicError(400, "Missing entry identifier");
    return store.update((data) => {
      data[key] = data[key].filter((item) => item.id !== id);
      if (section === "articles") data.attachments = (data.attachments || []).filter((item) => item.articleId !== id);
    });
  }
  let entry;
  if (section === "articles") {
    const title = required(form, "title", 240);
    const content = richText(form);
    const cardMediaId = cleanMediaId(form.get("cardMediaId") || "");
    if (form.get("cardMediaId") && !cardMediaId) throw publicError(400, "Invalid article card image");
    if (cardMediaId && !store.read().media.some((media) => media.id === cardMediaId)) throw publicError(400, "Choose an uploaded image for the article card");
    for (const mediaId of mediaIdsInRichText(content || { type: "doc", content: [] })) if (!store.read().media.some((media) => media.id === mediaId)) throw publicError(400, "Choose an uploaded image for the article content");
    entry = { id: id || uniqueId(title), title, category: required(form, "category", 120), status: enumValue(form, "status", ["Article", "Preprint", "Working Paper", "Peer Reviewed", "Draft", "Thesis"]), date: text(form, "date", 200), tags: csv(form, "tags", 12, 60), abstract: text(form, "abstract", 2000), metrics: metrics(form), body: [], method: text(form, "method", 3000), cardMediaId, content, embed: customEmbed(form, 0, Boolean(content)) };
  } else if (section === "experience") {
    const role = required(form, "role", 160);
    entry = { id: id || uniqueId(role), company: required(form, "company", 160), role, period: text(form, "period", 120), location: text(form, "location", 160), highlights: lines(form, "highlights", 20, 1000), isCurrent: form.get("isCurrent") === "1" };
  } else {
    const degree = required(form, "degree", 160);
    entry = { id: id || uniqueId(degree), degree, school: required(form, "school", 160), period: text(form, "period", 120), location: text(form, "location", 160), note: text(form, "note", 3000), isCurrent: form.get("isCurrent") === "1" };
  }
  return store.update((data) => {
    const index = data[key].findIndex((item) => item.id === entry.id);
    if (index >= 0) data[key][index] = entry;
    else data[key].unshift(entry);
  });
}

function splitEnv(name) { return (process.env[name] || "").split(",").map((value) => value.trim()).filter(Boolean); }
function normalizeOrigin(value) { const parsed = new URL(value); if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) throw new Error("APP_ORIGIN must be an http(s) origin without a path"); return parsed.origin; }
function numberEnv(name, fallback, min, max) { const value = Number.parseInt(process.env[name] || String(fallback), 10); if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${name} must be between ${min} and ${max}`); return value; }
function publicError(status, message) { const error = new Error(message); error.status = status; error.expose = true; return error; }
function cleanId(value) { const id = String(value); return /^[a-z0-9][a-z0-9-]{0,99}$/.test(id) ? id : ""; }
function cleanMediaId(value) { const id = String(value); return /^[a-f0-9]{32}$/.test(id) ? id : ""; }
function uniqueId(value) { const slug = value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "entry"; return `${slug}-${randomBytes(5).toString("hex")}`; }
function text(form, name, max) { const value = String(form.get(name) || "").trim(); if (value.length > max) throw publicError(400, `${name} is too long`); return value; }
function required(form, name, max) { const value = text(form, name, max); if (!value) throw publicError(400, `${name} is required`); return value; }
function email(form, name) { const value = required(form, name, 254); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw publicError(400, "Enter a valid email address"); return value; }
function httpUrl(form, name) { const value = text(form, name, 500); if (!value) return ""; try { const parsed = new URL(value); if (!/^https?:$/.test(parsed.protocol)) throw new Error(); return parsed.toString(); } catch { throw publicError(400, `${name} must be a valid http(s) URL`); } }
function enumValue(form, name, allowed) { const value = String(form.get(name) || ""); if (!allowed.includes(value)) throw publicError(400, `Invalid ${name}`); return value; }
function csv(form, name, limit, itemMax) { const values = text(form, name, limit * (itemMax + 1)).split(",").map((value) => value.trim()).filter(Boolean); if (values.length > limit || values.some((value) => value.length > itemMax)) throw publicError(400, `Invalid ${name}`); return values; }
function lines(form, name, limit, itemMax) { const values = text(form, name, limit * (itemMax + 1)).split(/\r?\n/).map((value) => value.trim()).filter(Boolean); if (values.length > limit || values.some((value) => value.length > itemMax)) throw publicError(400, `Invalid ${name}`); return values; }
function paragraphs(form, name, limit, itemMax) { const values = text(form, name, limit * (itemMax + 2)).split(/\n\s*\n/).map((value) => value.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean); if (values.length > limit || values.some((value) => value.length > itemMax)) throw publicError(400, `Invalid ${name}`); return values; }
function richText(form) { const raw = rawText(form, "content", 150_000); if (!raw) return null; try { return sanitizeRichText(JSON.parse(raw)); } catch (error) { throw publicError(400, error.message); } }
function metrics(form) { return lines(form, "metrics", 12, 200).map((line) => { const index = line.indexOf("|"); if (index < 1) throw publicError(400, "Each metric must use: label | value"); const label = line.slice(0, index).trim(); const value = line.slice(index + 1).trim(); if (!label || !value || label.length > 100 || value.length > 100) throw publicError(400, "Invalid metric"); return { label, value }; }); }
function rawText(form, name, max) { const value = String(form.get(name) || ""); if (Buffer.byteLength(value, "utf8") > max) throw publicError(400, `${name} is too long`); return value; }
function customEmbed(form, paragraphCount, richContent = false) {
  const html = rawText(form, "embedHtml", 350_000);
  const css = rawText(form, "embedCss", 200_000);
  const js = rawText(form, "embedJs", 350_000);
  const rawData = rawText(form, "embedData", 500_000);
  if (!html && !css && !js && !rawData) return null;
  let data = "";
  if (rawData) { try { data = JSON.stringify(JSON.parse(rawData)); } catch { throw publicError(400, "Graph JSON data must be valid JSON"); } }
  let placement = enumValue(form, "embedPlacement", ["only", "before", "end", ...Array.from({ length: 30 }, (_, index) => `after-${index + 1}`)]);
  const after = /^after-(\d+)$/.exec(placement);
  if (after && richContent) placement = "end";
  else if (after && Number(after[1]) > paragraphCount) throw publicError(400, "Choose an embed placement that exists in the article body");
  const height = Number(form.get("embedHeight"));
  if (!Number.isInteger(height) || height < 200 || height > 3000) throw publicError(400, "Embed height must be between 200 and 3000 pixels");
  return { html, css, js, data, placement, height };
}

async function readForm(request) {
  const contentType = request.headers["content-type"] || "";
  if (!contentType.toLowerCase().startsWith("application/x-www-form-urlencoded")) throw publicError(415, "Unsupported form encoding");
  return new URLSearchParams((await readRequestBuffer(request, 3_200_000)).toString("utf8"));
}
async function readRequestBuffer(request, maxBytes) {
  const declared = Number(request.headers["content-length"] || 0);
  if (declared > maxBytes) throw publicError(413, "Request is too large");
  const chunks = [];
  let size = 0;
  for await (const chunk of request) { size += chunk.length; if (size > maxBytes) throw publicError(413, "Request is too large"); chunks.push(chunk); }
  return Buffer.concat(chunks, size);
}
async function readMultipartUpload(request, fieldName, maxFileBytes) {
  const contentType = String(request.headers["content-type"] || "");
  const match = /^multipart\/form-data\s*;\s*boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType);
  if (!match) throw publicError(415, "Upload must use multipart form data");
  const boundary = match[1] || match[2];
  if (!boundary || boundary.length > 200) throw publicError(400, "Invalid upload boundary");
  const raw = (await readRequestBuffer(request, maxFileBytes + 32_768)).toString("latin1");
  const fields = new URLSearchParams();
  let file = null;
  for (const piece of raw.split(`--${boundary}`).slice(1)) {
    if (piece.startsWith("--")) break;
    const part = piece.replace(/^\r\n/, "").replace(/\r\n$/, "");
    const separator = part.indexOf("\r\n\r\n");
    if (separator < 0) continue;
    const header = part.slice(0, separator);
    const payload = part.slice(separator + 4);
    const disposition = /content-disposition:\s*form-data;[^\r\n]*name="([^"]+)"(?:;\s*filename="([^"]*)")?/i.exec(header);
    if (!disposition) continue;
    const name = disposition[1];
    if (disposition[2] !== undefined) {
      if (name !== fieldName || !disposition[2] || file) throw publicError(400, `Upload one ${fieldName} file`);
      file = Buffer.from(payload, "latin1");
    } else {
      fields.set(name, Buffer.from(payload, "latin1").toString("utf8"));
    }
  }
  if (!file || file.length === 0 || file.length > maxFileBytes) throw publicError(400, `Choose a ${fieldName} file within the allowed size`);
  return { fields, file };
}
function readBackupUpload(request) { return readMultipartUpload(request, "backup", 5 * 1024 * 1024); }
function readImageUpload(request) { return readMultipartUpload(request, "image", 8 * 1024 * 1024); }
function readPdfUpload(request) { return readMultipartUpload(request, "pdf", 20 * 1024 * 1024); }
function sameOrigin(request) { const origin = request.headers.origin; return typeof origin === "string" && origin === appOrigin; }
function clientIp(request) { return request.socket.remoteAddress || "unknown"; }
function rateLimit(request, namespace, limit, windowSeconds) { const now = Date.now(); const key = `${namespace}:${clientIp(request)}`; const bucket = rateBuckets.get(key); if (!bucket || bucket.reset <= now) { rateBuckets.set(key, { count: 1, reset: now + windowSeconds * 1000 }); return true; } bucket.count += 1; if (rateBuckets.size > 5000) for (const [candidate, value] of rateBuckets) if (value.reset <= now) rateBuckets.delete(candidate); return bucket.count <= limit; }
function redirect(response, location) { response.writeHead(303, { Location: location, "Cache-Control": "no-store" }); response.end(); }
function sendBackup(response, backup) { const payload = `${JSON.stringify(backup, null, 2)}\n`; response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": "attachment; filename=lorenzo-portfolio-backup.json", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" }); response.end(response.headOnly ? undefined : payload); }
function sendArticleEmbed(response, article) {
  response.removeHeader("X-Frame-Options");
  response.setHeader("Content-Security-Policy", "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: https:; font-src data:; media-src data: https:; connect-src 'none'");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" });
  if (response.headOnly) return response.end();
  const data = scriptJson(article.embed.data || "null");
  response.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${article.embed.css}</style></head><body>${article.embed.html}<script>window.__ARTICLE_DATA__=${data};</script><script>${article.embed.js}</script></body></html>`);
}
function sendDownload(response, value, attachment) { const stem = String(attachment.title).replace(/\.pdf$/i, "").replace(/[^A-Za-z0-9._ -]/g, "_").slice(0, 176) || "download"; const filename = `${stem}.pdf`; response.writeHead(200, { "Content-Type": "application/pdf", "Content-Length": value.length, "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow" }); response.end(response.headOnly ? undefined : value); }
function sendHtml(response, status, html, noStore = false) { response.writeHead(status, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": noStore ? "no-store" : "public, max-age=0, must-revalidate", ...(noStore ? { "X-Robots-Tag": "noindex, nofollow" } : {}) }); response.end(response.headOnly ? undefined : html); }
function sendJson(response, status, value) { response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); response.end(response.headOnly ? undefined : JSON.stringify(value)); }
function sendBinary(response, status, value, type, maxAge = 3600) { response.writeHead(status, { "Content-Type": type, "Content-Length": value.length, "Cache-Control": `public, max-age=${maxAge}`, "X-Content-Type-Options": "nosniff" }); response.end(response.headOnly ? undefined : value); }
async function sendStatic(response, path, type, maxAge = 3600) { try { const value = await readFile(path); response.writeHead(200, { "Content-Type": type, "Content-Length": value.length, "Cache-Control": `public, max-age=${maxAge}`, "X-Content-Type-Options": "nosniff" }); response.end(response.headOnly ? undefined : value); } catch { sendHtml(response, 404, errorPage(404, "Asset not found")); } }
function scriptJson(value) { return String(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029"); }

server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 5_000;
server.maxHeadersCount = 100;

server.listen(port, "0.0.0.0", () => console.log(`Portfolio listening on ${appOrigin}`));

function shutdown(signal) { console.log(`${signal} received; closing server`); server.close((error) => { if (error) console.error(error); process.exit(error ? 1 : 0); }); setTimeout(() => process.exit(1), 10_000).unref(); }
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
