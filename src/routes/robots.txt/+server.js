import { getApp } from "$lib/server/app.mjs";
import { buildRobots } from "$lib/sitemap.js";

export async function GET() {
  const app = await getApp();
  return new Response(buildRobots(app.appOrigin), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
      "x-content-type-options": "nosniff"
    }
  });
}
