import { error } from "@sveltejs/kit";
import { getApp } from "$lib/server/app.mjs";

const scriptJson = (value) => String(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

export async function GET({ params }) {
  const { store } = await getApp();
  const article = store.read().articles.find((item) => item.id === params.articleId);
  const figure = article?.figures?.find((item) => item.id === params.figureId);
  if (!figure) throw error(404, "Interactive figure not found");
  const data = scriptJson(figure.data || "null");
  const figureId = scriptJson(JSON.stringify(figure.id));
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;font-family:system-ui,sans-serif}${figure.css}\nhtml,body{overflow:hidden;background:transparent!important}:root[data-article-theme=dark] body{color:#f1f3f5}</style></head><body>${figure.html}<script>window.__ARTICLE_DATA__=${data};</script><script>${figure.js}</script><script>(()=>{const id=${figureId};let pending=0;const report=()=>{pending=0;const body=document.body,root=document.documentElement;let bottom=0;for(const child of body.children){const rect=child.getBoundingClientRect();bottom=Math.max(bottom,rect.bottom+window.scrollY)}const height=Math.ceil(Math.max(body.offsetHeight,body.scrollHeight,bottom));parent.postMessage({type:"article-figure-resize",id,height},"*")};const schedule=()=>{if(!pending)pending=requestAnimationFrame(report)};new ResizeObserver(schedule).observe(document.body);new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});addEventListener("load",schedule);addEventListener("resize",schedule);addEventListener("message",event=>{if(event.data?.type!=="article-figure-theme")return;document.documentElement.dataset.articleTheme=event.data.theme==="dark"?"dark":"light";schedule()});schedule()})();</script></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow", "content-security-policy": "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: https: http:; font-src data:; media-src data: https: http:; connect-src 'none'", "referrer-policy": "no-referrer" } });
}
