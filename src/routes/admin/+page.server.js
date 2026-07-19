import { fail, redirect } from "@sveltejs/kit";
import { parseBackup } from "../../backup.mjs";
import { getApp } from "$lib/server/app.mjs";
import { articleUsesMedia, cleanId, cleanMediaId, handleContentWrite } from "$lib/server/content.mjs";

const sections = new Set(["profile", "articles", "experience", "education"]);

export async function load({ url, locals }) {
  const app = await getApp();
  if (!locals.user) return { configured: app.oauthConfigured, authenticated: false };
  const section = sections.has(url.searchParams.get("section")) ? url.searchParams.get("section") : "profile";
  const editId = cleanId(url.searchParams.get("edit") || "");
  const notice = { saved: "Changes saved and published.", deleted: "Entry deleted.", ordered: "Article order updated and published.", restored: "Backup restored and published.", "media-deleted": "Image deleted from the media library.", "attachment-deleted": "Document deleted from the article." }[url.searchParams.get("notice")] || "";
  return { authenticated: true, content: app.store.read(), section, editId, notice, user: locals.user };
}

function requireUser(locals) {
  if (!locals.user) throw redirect(303, "/admin");
  return locals.user;
}

async function verifiedForm(request, locals, app) {
  const user = requireUser(locals);
  const form = await request.formData();
  if (!app.security.safeEqual(form.get("csrf") || "", user.csrf)) return { error: fail(403, { message: "Your editing session expired. Refresh and try again." }) };
  return { form, user };
}

async function contentAction(event, action, section) {
  const app = await getApp();
  const verified = await verifiedForm(event.request, event.locals, app);
  if (verified.error) return verified.error;
  try { await handleContentWrite(app, action, verified.form); }
  catch (cause) { return fail(cause.status || 400, { message: cause.expose || cause.status ? cause.message : "The change could not be saved." }); }
  const notice = action.endsWith(":delete") ? "deleted" : action.endsWith(":reorder") ? "ordered" : "saved";
  throw redirect(303, `/admin?section=${section}&notice=${notice}`);
}

async function removeUploadRecord(app, collection, record) {
  await app.store.update((data) => { data[collection] = (data[collection] || []).filter((item) => item.id !== record.id); });
  try { await app.mediaStore.remove(record.filename); }
  catch (error) {
    await app.store.update((data) => { if (!(data[collection] || []).some((item) => item.id === record.id)) (data[collection] ||= []).unshift(record); });
    throw error;
  }
}

export const actions = {
  profile: (event) => contentAction(event, "profile", "profile"),
  saveArticle: (event) => contentAction(event, "articles:save", "articles"),
  deleteArticle: (event) => contentAction(event, "articles:delete", "articles"),
  reorderArticle: (event) => contentAction(event, "articles:reorder", "articles"),
  saveExperience: (event) => contentAction(event, "experience:save", "experience"),
  deleteExperience: (event) => contentAction(event, "experience:delete", "experience"),
  saveEducation: (event) => contentAction(event, "education:save", "education"),
  deleteEducation: (event) => contentAction(event, "education:delete", "education"),
  uploadMedia: async ({ request, locals }) => {
    const app = await getApp();
    const verified = await verifiedForm(request, locals, app);
    if (verified.error) return verified.error;
    const file = verified.form.get("image");
    if (!(file instanceof File) || !file.size || file.size > 8 * 1024 * 1024) return fail(400, { message: "Choose a PNG, JPEG, GIF, or WebP image up to 8 MB." });
    try {
      const record = await app.mediaStore.save(Buffer.from(await file.arrayBuffer()), ["png", "jpg", "gif", "webp"]);
      record.alt = String(verified.form.get("alt") || "").trim().slice(0, 300);
      await app.store.update((data) => { (data.media ||= []).unshift(record); });
    } catch (cause) { return fail(400, { message: cause.message }); }
    const articleId = cleanId(verified.form.get("articleId") || "");
    throw redirect(303, articleId ? `/admin?section=articles&edit=${articleId}&notice=saved` : "/admin?section=articles&notice=saved");
  },
  deleteMedia: async ({ request, locals }) => {
    const app = await getApp();
    const verified = await verifiedForm(request, locals, app);
    if (verified.error) return verified.error;
    const id = cleanMediaId(verified.form.get("id") || "");
    const record = (app.store.read().media || []).find((item) => item.id === id);
    if (!record) return fail(404, { message: "Image not found." });
    const articles = app.store.read().articles.filter((article) => articleUsesMedia(article, id));
    if (articles.length) return fail(409, { message: `Remove this image from ${articles.length === 1 ? `“${articles[0].title}”` : `${articles.length} articles`} before deleting it.` });
    try { await removeUploadRecord(app, "media", record); }
    catch { return fail(500, { message: "The image could not be deleted." }); }
    const articleId = cleanId(verified.form.get("articleId") || "");
    throw redirect(303, articleId ? `/admin?section=articles&edit=${articleId}&notice=media-deleted` : "/admin?section=articles&notice=media-deleted");
  },
  uploadAttachment: async ({ request, locals }) => {
    const app = await getApp();
    const verified = await verifiedForm(request, locals, app);
    if (verified.error) return verified.error;
    const articleId = cleanId(verified.form.get("articleId") || "");
    const title = String(verified.form.get("title") || "").trim();
    const file = verified.form.get("pdf");
    if (!articleId || !app.store.read().articles.some((article) => article.id === articleId)) return fail(400, { message: "Save the article before attaching a PDF." });
    if (!title || title.length > 240) return fail(400, { message: "Enter a download label." });
    if (!(file instanceof File) || !file.size || file.size > 20 * 1024 * 1024) return fail(400, { message: "Choose a PDF up to 20 MB." });
    try {
      const record = await app.mediaStore.save(Buffer.from(await file.arrayBuffer()), ["pdf"]);
      await app.store.update((data) => { (data.attachments ||= []).unshift({ ...record, articleId, title }); });
    } catch (cause) { return fail(400, { message: cause.message }); }
    throw redirect(303, `/admin?section=articles&edit=${articleId}&notice=saved`);
  },
  deleteAttachment: async ({ request, locals }) => {
    const app = await getApp();
    const verified = await verifiedForm(request, locals, app);
    if (verified.error) return verified.error;
    const id = cleanMediaId(verified.form.get("id") || "");
    const record = (app.store.read().attachments || []).find((item) => item.id === id);
    if (!record) return fail(404, { message: "Document not found." });
    try { await removeUploadRecord(app, "attachments", record); }
    catch { return fail(500, { message: "The document could not be deleted." }); }
    throw redirect(303, `/admin?section=articles&edit=${record.articleId}&notice=attachment-deleted`);
  },
  restore: async ({ request, locals }) => {
    const app = await getApp();
    const verified = await verifiedForm(request, locals, app);
    if (verified.error) return verified.error;
    const file = verified.form.get("backup");
    if (verified.form.get("replace") !== "yes") return fail(400, { message: "Confirm that the restore replaces current data." });
    if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024) return fail(400, { message: "Choose a JSON backup up to 5 MB." });
    try { await app.store.replace(parseBackup(await file.text())); }
    catch (cause) { return fail(400, { message: cause.message }); }
    throw redirect(303, "/admin?section=profile&notice=restored");
  }
};
