import { error, redirect } from "@sveltejs/kit";
import { getApp } from "$lib/server/app.mjs";
import { articleSlug } from "$lib/article-slug.js";
import { articleShareMetadata } from "$lib/article-social.js";
import { legacyBodyToRichText, renderRichText } from "../../../rich-text.mjs";

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

export async function load({ params }) {
  const { store, appOrigin } = await getApp();
  const site = store.read();
  const article = site.articles.find((item) => articleSlug(item.title) === params.id) || site.articles.find((item) => item.id === params.id);
  if (!article) throw error(404, "Article not found");
  const slug = articleSlug(article.title);
  if (params.id !== slug) throw redirect(308, `/articles/${slug}`);
  const figures = article.figures || [];
  const content = article.content || legacyBodyToRichText(article.body || []);
  const articleHtml = renderRichText(content, {
    renderFigure(id) {
      const figure = figures.find((item) => item.id === id);
      if (!figure) return "";
      const height = Number.isInteger(figure.height) ? figure.height : 520;
      const layout = ["contained", "wide", "full"].includes(figure.layout) ? figure.layout : "contained";
      return `<figure class="interactive-figure interactive-figure--${layout}"><div class="figure-label"><span>Interactive figure</span><strong>${escapeHtml(figure.title)}</strong></div><iframe data-figure-frame data-figure-id="${escapeHtml(figure.id)}" data-min-height="${height}" title="${escapeHtml(figure.title)}" src="/figures/${encodeURIComponent(article.id)}/${encodeURIComponent(figure.id)}" height="${height}" scrolling="no" sandbox="allow-scripts" referrerpolicy="no-referrer" loading="lazy"></iframe>${figure.caption ? `<figcaption>${escapeHtml(figure.caption)}</figcaption>` : ""}</figure>`;
    }
  });
  const attachments = (site.attachments || []).filter((item) => item.articleId === article.id);
  const share = articleShareMetadata(article, site.media, appOrigin, site.profile.name);
  return { article, articleHtml, attachments, profile: site.profile, share };
}
