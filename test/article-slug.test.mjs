import test from "node:test";
import assert from "node:assert/strict";
import { articleSlug } from "../src/lib/article-slug.js";

test("article links use lowercase title words separated by hyphens", () => {
  assert.equal(articleSlug("A Better Article: Risk & Return"), "a-better-article-risk-return");
  assert.equal(articleSlug("  Café Pricing — An Empirical Note  "), "cafe-pricing-an-empirical-note");
});

test("article slugs never produce an empty path", () => {
  assert.equal(articleSlug("---"), "article");
});
