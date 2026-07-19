import { articleSlug } from "./article-slug.js";

function xml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function absolute(origin, path) {
  return new URL(path, `${String(origin).replace(/\/$/, "")}/`).href;
}

export function buildSitemap(data, origin) {
  const pages = [
    { path: "/", changefreq: "weekly", priority: "1.0" },
    { path: "/about", changefreq: "monthly", priority: "0.7" },
    { path: "/contact", changefreq: "monthly", priority: "0.5" },
    ...(data.articles || []).map((article) => ({ path: `/articles/${articleSlug(article.title)}`, changefreq: "monthly", priority: "0.8" }))
  ];
  const urls = pages.map(({ path, changefreq, priority }) => `  <url>\n    <loc>${xml(absolute(origin, path))}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function buildRobots(origin) {
  return `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /auth/\n\nSitemap: ${absolute(origin, "/sitemap.xml")}\n`;
}
