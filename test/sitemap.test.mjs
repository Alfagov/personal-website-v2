import test from "node:test";
import assert from "node:assert/strict";
import { buildRobots, buildSitemap } from "../src/lib/sitemap.js";

test("sitemap exposes canonical public pages and title-based article URLs", () => {
  const data = { articles: [{ title: "A Model & Its Results" }, { title: "Café Markets" }] };
  const sitemap = buildSitemap(data, "https://example.com");
  assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(sitemap, /<loc>https:\/\/example\.com\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/example\.com\/about<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/example\.com\/contact<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/example\.com\/articles\/a-model-its-results<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/example\.com\/articles\/cafe-markets<\/loc>/);
  assert.doesNotMatch(sitemap, /\/admin|\/auth\//);
});

test("robots advertises the absolute sitemap URL", () => {
  const robots = buildRobots("https://example.com/");
  assert.match(robots, /Disallow: \/admin/);
  assert.match(robots, /Sitemap: https:\/\/example\.com\/sitemap\.xml/);
});
