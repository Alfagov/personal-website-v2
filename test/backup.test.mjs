import test from "node:test";
import assert from "node:assert/strict";
import { createBackup, parseBackup } from "../src/backup.mjs";
import { defaultData } from "../src/default-data.mjs";

test("backup round-trips custom article code", () => {
  const data = structuredClone(defaultData);
  data.articles[0].embed = { html: "<main>Demo</main>", css: "main{padding:2rem}", js: "console.log('demo')", data: "{\"points\":[1,2,3]}", placement: "only", height: 900 };
  const restored = parseBackup(JSON.stringify(createBackup(data)));
  assert.deepEqual(restored.articles[0].embed, data.articles[0].embed);
});

test("backup rejects malformed custom code placement", () => {
  const backup = createBackup(defaultData);
  backup.data.articles[0].embed = { html: "", css: "", js: "", placement: "outside", height: 720 };
  assert.throws(() => parseBackup(JSON.stringify(backup)), /Invalid code placement/);
});

test("backup preserves uploaded media metadata and validates graph JSON", () => {
  const data = structuredClone(defaultData);
  data.media = [{ id: "0123456789abcdef0123456789abcdef", filename: "0123456789abcdef0123456789abcdef.png", mime: "image/png", size: 42, createdAt: "2026-07-17T00:00:00.000Z", alt: "Chart image" }];
  data.articles[0].cardMediaId = data.media[0].id;
  data.attachments = [{ id: "fedcba9876543210fedcba9876543210", articleId: data.articles[0].id, filename: "fedcba9876543210fedcba9876543210.pdf", mime: "application/pdf", size: 42, createdAt: "2026-07-17T00:00:00.000Z", title: "Research appendix" }];
  data.articles[0].embed = { html: "", css: "", js: "", data: "{\"series\":[1,2]}", placement: "only", height: 640 };
  const restored = parseBackup(JSON.stringify(createBackup(data)));
  assert.equal(restored.media[0].alt, "Chart image");
  assert.equal(restored.articles[0].cardMediaId, data.media[0].id);
  assert.equal(restored.attachments[0].title, "Research appendix");
  assert.equal(restored.articles[0].embed.data, "{\"series\":[1,2]}");
});
