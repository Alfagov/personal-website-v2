import { randomBytes } from "node:crypto";
import { figureIdsInRichText, mediaIdsInRichText, sanitizeRichText } from "../../rich-text.mjs";
import { articleSlug } from "../article-slug.js";
import { sanitizeCardImage } from "../card-image.js";
import { publicError } from "./app.mjs";

const STATUSES = ["Article", "Preprint", "Working Paper", "Peer Reviewed", "Draft", "Thesis"];
const FIGURE_LAYOUTS = ["contained", "wide", "full"];

export async function handleContentWrite(app, action, form) {
  if (action === "profile") {
    const profile = {
      name: required(form, "name", 120),
      availability: text(form, "availability", 200),
      eyebrow: text(form, "eyebrow", 240),
      headline: required(form, "headline", 300),
      intro: required(form, "intro", 1200),
      about: required(form, "about", 4000),
      email: email(form, "email"),
      phone: text(form, "phone", 100),
      location: text(form, "location", 200),
      linkedin: httpUrl(form, "linkedin"),
      github: httpUrl(form, "github")
    };
    return app.store.update((data) => { data.profile = profile; });
  }

  const match = /^(articles|experience|education):(save|delete)$/.exec(action);
  if (!match) throw publicError(404, "Admin action not found");
  const [, section, operation] = match;
  const key = section === "articles" ? "articles" : section === "experience" ? "experiences" : "education";
  const id = cleanId(form.get("id") || "");

  if (operation === "delete") {
    if (!id) throw publicError(400, "Missing entry identifier");
    return app.store.update((data) => {
      data[key] = data[key].filter((item) => item.id !== id);
      if (section === "articles") data.attachments = (data.attachments || []).filter((item) => item.articleId !== id);
    });
  }

  let entry;
  if (section === "articles") {
    const title = required(form, "title", 240);
    const duplicateSlug = app.store.read().articles.find((article) => article.id !== id && articleSlug(article.title) === articleSlug(title));
    if (duplicateSlug) throw publicError(400, "Another article already uses this title and public link");
    const content = richText(form);
    const figures = figureList(form);
    const figureIds = new Set(figures.map((figure) => figure.id));
    for (const figureId of figureIdsInRichText(content || { type: "doc", content: [] })) {
      if (!figureIds.has(figureId)) throw publicError(400, "An interactive figure in the article is missing from the figure library");
    }
    const cardMediaId = cleanMediaId(form.get("cardMediaId") || "");
    if (form.get("cardMediaId") && !cardMediaId) throw publicError(400, "Invalid article card image");
    const allMedia = app.store.read().media || [];
    if (cardMediaId && !allMedia.some((media) => media.id === cardMediaId)) throw publicError(400, "Choose an uploaded image for the article card");
    for (const mediaId of mediaIdsInRichText(content || { type: "doc", content: [] })) {
      if (!allMedia.some((media) => media.id === mediaId)) throw publicError(400, "Choose an uploaded image for the article content");
    }
    const existing = id ? app.store.read().articles.find((article) => article.id === id) : null;
    entry = {
      id: id || uniqueId(title),
      title,
      category: required(form, "category", 120),
      status: enumValue(form, "status", STATUSES),
      date: text(form, "date", 200),
      tags: csv(form, "tags", 12, 60),
      abstract: text(form, "abstract", 2000),
      metrics: metrics(form),
      body: [],
      method: text(form, "method", 3000),
      cardMediaId,
      cardImage: cardImage(form),
      content,
      figures,
      embed: existing?.embed || null
    };
  } else if (section === "experience") {
    const role = required(form, "role", 160);
    entry = { id: id || uniqueId(role), company: required(form, "company", 160), role, period: text(form, "period", 120), location: text(form, "location", 160), highlights: lines(form, "highlights", 20, 1000), isCurrent: form.get("isCurrent") === "1" };
  } else {
    const degree = required(form, "degree", 160);
    entry = { id: id || uniqueId(degree), degree, school: required(form, "school", 160), period: text(form, "period", 120), location: text(form, "location", 160), note: text(form, "note", 3000), isCurrent: form.get("isCurrent") === "1" };
  }

  return app.store.update((data) => {
    const index = data[key].findIndex((item) => item.id === entry.id);
    if (index >= 0) data[key][index] = entry;
    else data[key].unshift(entry);
  });
}

export function sanitizeFigures(value) {
  if (!Array.isArray(value) || value.length > 24) throw publicError(400, "An article can contain up to 24 interactive figures");
  const seen = new Set();
  return value.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw publicError(400, "Invalid interactive figure");
    const id = String(raw.id || "");
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id) || seen.has(id)) throw publicError(400, "Interactive figures need unique identifiers");
    seen.add(id);
    const title = bounded(raw.title, 160, `Figure ${index + 1}`);
    const caption = bounded(raw.caption, 1000, "");
    const html = boundedBytes(raw.html, 350_000, "Figure HTML");
    const css = boundedBytes(raw.css, 200_000, "Figure CSS");
    const js = boundedBytes(raw.js, 350_000, "Figure JavaScript");
    let data = boundedBytes(raw.data, 500_000, "Figure data");
    if (data) {
      try { data = JSON.stringify(JSON.parse(data), null, 2); } catch { throw publicError(400, `The JSON data for “${title}” is invalid`); }
    }
    const height = Number(raw.height);
    if (!Number.isInteger(height) || height < 200 || height > 2000) throw publicError(400, `The height for “${title}” must be between 200 and 2000 pixels`);
    const layout = FIGURE_LAYOUTS.includes(raw.layout) ? raw.layout : "contained";
    return { id, title, caption, html, css, js, data, height, layout };
  });
}

function figureList(form) {
  const raw = String(form.get("figures") || "[]");
  if (Buffer.byteLength(raw, "utf8") > 1_500_000) throw publicError(400, "Interactive figure library is too large");
  try { return sanitizeFigures(JSON.parse(raw)); } catch (error) { if (error.status) throw error; throw publicError(400, "Interactive figure library must be valid JSON"); }
}

function richText(form) {
  const raw = rawText(form, "content", 150_000);
  if (!raw) return null;
  try { return sanitizeRichText(JSON.parse(raw)); } catch (error) { throw publicError(400, error.message); }
}

function cardImage(form) {
  const raw = rawText(form, "cardImage", 1000);
  if (!raw) return sanitizeCardImage();
  try { return sanitizeCardImage(JSON.parse(raw)); }
  catch { throw publicError(400, "Invalid article card image settings"); }
}

function metrics(form) {
  return lines(form, "metrics", 12, 200).map((line) => {
    const index = line.indexOf("|");
    if (index < 1) throw publicError(400, "Each metric must use: label | value");
    const label = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (!label || !value || label.length > 100 || value.length > 100) throw publicError(400, "Invalid metric");
    return { label, value };
  });
}

export function cleanId(value) { const id = String(value); return /^[a-z0-9][a-z0-9-]{0,99}$/.test(id) ? id : ""; }
export function cleanMediaId(value) { const id = String(value); return /^[a-f0-9]{32}$/.test(id) ? id : ""; }
export function articleUsesMedia(article, mediaId) {
  if (!article || !cleanMediaId(mediaId)) return false;
  if (article.cardMediaId === mediaId) return true;
  if (article.content) {
    try { if (mediaIdsInRichText(article.content).has(mediaId)) return true; } catch {}
  }
  const path = `/media/${mediaId}`;
  const marker = `[[image:${mediaId}]]`;
  if ((article.body || []).some((value) => String(value).includes(marker) || String(value).includes(path))) return true;
  return article.embed ? JSON.stringify(article.embed).includes(path) : false;
}
function uniqueId(value) { const slug = value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "entry"; return `${slug}-${randomBytes(5).toString("hex")}`; }
function bounded(value, max, fallback) { const result = String(value ?? fallback).trim(); if (result.length > max) throw publicError(400, "Interactive figure text is too long"); return result || fallback; }
function boundedBytes(value, max, label) { const result = String(value || ""); if (Buffer.byteLength(result, "utf8") > max) throw publicError(400, `${label} is too large`); return result; }
function text(form, name, max) { const value = String(form.get(name) || "").trim(); if (value.length > max) throw publicError(400, `${name} is too long`); return value; }
function required(form, name, max) { const value = text(form, name, max); if (!value) throw publicError(400, `${name} is required`); return value; }
function email(form, name) { const value = required(form, name, 254); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw publicError(400, "Enter a valid email address"); return value; }
function httpUrl(form, name) { const value = text(form, name, 500); if (!value) return ""; try { const parsed = new URL(value); if (!/^https?:$/.test(parsed.protocol)) throw new Error(); return parsed.toString(); } catch { throw publicError(400, `${name} must be a valid http(s) URL`); } }
function enumValue(form, name, allowed) { const value = String(form.get(name) || ""); if (!allowed.includes(value)) throw publicError(400, `Invalid ${name}`); return value; }
function csv(form, name, limit, itemMax) { const values = text(form, name, limit * (itemMax + 1)).split(",").map((value) => value.trim()).filter(Boolean); if (values.length > limit || values.some((value) => value.length > itemMax)) throw publicError(400, `Invalid ${name}`); return values; }
function lines(form, name, limit, itemMax) { const values = text(form, name, limit * (itemMax + 1)).split(/\r?\n/).map((value) => value.trim()).filter(Boolean); if (values.length > limit || values.some((value) => value.length > itemMax)) throw publicError(400, `Invalid ${name}`); return values; }
function rawText(form, name, max) { const value = String(form.get(name) || ""); if (Buffer.byteLength(value, "utf8") > max) throw publicError(400, `${name} is too long`); return value; }
