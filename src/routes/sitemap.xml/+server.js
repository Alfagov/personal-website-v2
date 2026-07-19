import { getApp } from "$lib/server/app.mjs";
import { buildSitemap } from "$lib/sitemap.js";

export async function GET() {
  const app = await getApp();
  return new Response(buildSitemap(app.store.read(), app.appOrigin), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
      "x-content-type-options": "nosniff"
    }
  });
}
