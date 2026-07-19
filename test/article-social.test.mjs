import test from "node:test";
import assert from "node:assert/strict";
import { articleShareMetadata } from "../src/lib/article-social.js";

test("article sharing metadata uses the canonical title URL and cover image", () => {
  const article = { title: "Pricing Risk & Return", abstract: "An article preview.", cardMediaId: "cover123" };
  const media = [{ id: "cover123", alt: "A risk and return chart" }];
  const share = articleShareMetadata(article, media, "https://example.com/", "Research Site");
  assert.deepEqual(share, {
    title: "Pricing Risk & Return",
    description: "An article preview.",
    url: "https://example.com/articles/pricing-risk-return",
    image: "https://example.com/media/cover123",
    imageAlt: "A risk and return chart"
  });
});

test("article sharing metadata falls back to the site preview image", () => {
  const article = { title: "Untitled Cover", abstract: "", cardMediaId: "" };
  const share = articleShareMetadata(article, [], "https://example.com", "Research Site");
  assert.equal(share.description, article.title);
  assert.equal(share.image, "https://example.com/og.png");
  assert.equal(share.imageAlt, "Untitled Cover — Research Site");
});
