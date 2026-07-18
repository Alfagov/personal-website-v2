import { error } from "@sveltejs/kit";
import { getApp } from "$lib/server/app.mjs";

export async function GET({ params }) {
  const { store, mediaStore } = await getApp();
  const attachment = (store.read().attachments || []).find((item) => item.id === params.id);
  if (!attachment) throw error(404, "PDF attachment not found");
  const body = await mediaStore.read(attachment.filename);
  if (!body) throw error(404, "PDF file not found");
  const stem = String(attachment.title).replace(/\.pdf$/i, "").replace(/[^A-Za-z0-9._ -]/g, "_").slice(0, 176) || "download";
  return new Response(body, { headers: { "content-type": "application/pdf", "content-length": String(body.length), "content-disposition": `attachment; filename="${stem}.pdf"`, "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" } });
}
