/** Build a stable, readable public path from an article title. */
export function articleSlug(title) {
  const slug = String(title || "")
    .normalize("NFKD")
    .replace(/\p{Mark}+/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "article";
}
