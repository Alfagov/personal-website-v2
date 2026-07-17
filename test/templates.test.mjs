import test from "node:test";
import assert from "node:assert/strict";
import { defaultData } from "../src/default-data.mjs";
import { articlePage, homePage } from "../src/templates.mjs";

test("stored content is HTML-escaped on public pages", () => {
  const data = structuredClone(defaultData);
  data.profile.headline = '<script>alert("xss")</script>';
  data.projects[0].url = "javascript:alert(1)";
  const html = homePage(data);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;alert/);
  assert.doesNotMatch(html, /href="javascript:/);
  assert.match(html, /href="#"/);
});

test("custom article code is referenced through a sandboxed iframe, never in the parent page", () => {
  const data = structuredClone(defaultData);
  data.articles[0].embed = { html: "<h1>Interactive content</h1>", css: "h1{color:red}", js: "alert('isolated')", placement: "end", height: 640 };
  const html = articlePage(data, data.articles[0]);
  assert.match(html, /src="\/article-content\/sanctions"/);
  assert.match(html, /sandbox="allow-scripts"/);
  assert.doesNotMatch(html, /Interactive content|alert\('isolated'\)/);
});

test("article attachments are rendered as download links", () => {
  const data = structuredClone(defaultData);
  data.attachments = [{ id: "fedcba9876543210fedcba9876543210", articleId: data.articles[0].id, filename: "fedcba9876543210fedcba9876543210.pdf", mime: "application/pdf", size: 2048, createdAt: "2026-07-17T00:00:00.000Z", title: "Research appendix" }];
  const html = articlePage(data, data.articles[0]);
  assert.match(html, /href="\/attachments\/fedcba9876543210fedcba9876543210"/);
  assert.match(html, /Research appendix/);
});

test("article cards can show a selected uploaded image or GIF", () => {
  const data = structuredClone(defaultData);
  data.media = [{ id: "0123456789abcdef0123456789abcdef", filename: "0123456789abcdef0123456789abcdef.gif", mime: "image/gif", size: 42, createdAt: "2026-07-17T00:00:00.000Z", alt: "Animated model" }];
  data.articles[0].cardMediaId = data.media[0].id;
  const html = homePage(data);
  assert.match(html, /class="card card--media"/);
  assert.match(html, /src="\/media\/0123456789abcdef0123456789abcdef"/);
  assert.match(html, /alt="Animated model"/);
});
