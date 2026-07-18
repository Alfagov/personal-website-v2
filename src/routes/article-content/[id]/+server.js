import { error } from "@sveltejs/kit";
import { getApp } from "$lib/server/app.mjs";

const scriptJson = (value) => String(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");

export async function GET({ params }) {
  const { store } = await getApp();
  const article = store.read().articles.find((item) => item.id === params.id && item.embed);
  if (!article) throw error(404, "Custom article content not found");
  const custom = article.embed;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${custom.css}</style></head><body>${custom.html}<script>window.__ARTICLE_DATA__=${scriptJson(custom.data || "null")};</script><script>${custom.js}</script></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow", "content-security-policy": "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: https: http:; connect-src 'none'", "referrer-policy": "no-referrer" } });
}
