import { error } from "@sveltejs/kit";
import { getApp } from "$lib/server/app.mjs";

export async function GET({ params }) {
  const { store, mediaStore } = await getApp();
  const media = (store.read().media || []).find((item) => item.id === params.id);
  if (!media) throw error(404, "Image not found");
  const body = await mediaStore.read(media.filename);
  if (!body) throw error(404, "Image file not found");
  return new Response(body, { headers: { "content-type": media.mime, "cache-control": "public, max-age=86400", "content-length": String(body.length) } });
}
