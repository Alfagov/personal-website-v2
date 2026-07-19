import { articleSlug } from "./article-slug.js";

function absolute(origin, path) {
  return new URL(path, `${String(origin).replace(/\/$/, "")}/`).href;
}

export function articleShareMetadata(article, media, origin, siteName = "") {
  const cover = (media || []).find((item) => item.id === article.cardMediaId);
  return {
    title: article.title,
    description: article.abstract || article.title,
    url: absolute(origin, `/articles/${articleSlug(article.title)}`),
    image: absolute(origin, cover ? `/media/${cover.id}` : "/og.png"),
    imageAlt: cover?.alt || `${article.title} — ${siteName || "article cover"}`
  };
}
