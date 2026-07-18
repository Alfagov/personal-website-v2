import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMediaStore } from "../src/media.mjs";

test("media store accepts allowed signatures and rejects executable SVG content", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lp-media-"));
  const store = createMediaStore(directory);
  await store.init();
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const saved = await store.save(png);
  assert.equal(saved.mime, "image/png");
  assert.match(saved.filename, /^[a-f0-9]{32}\.png$/);
  assert.deepEqual(await store.read(saved.filename), png);
  const pdf = Buffer.from("%PDF-1.7\n% test");
  const document = await store.save(pdf, ["pdf"]);
  assert.equal(document.mime, "application/pdf");
  assert.match(document.filename, /^[a-f0-9]{32}\.pdf$/);
  assert.deepEqual(await store.read(document.filename), pdf);
  assert.equal(await store.remove(saved.filename), true);
  assert.equal(await store.read(saved.filename), null);
  assert.equal(await store.remove(saved.filename), false);
  assert.throws(() => store.inspect(Buffer.from("<svg><script>alert(1)</script></svg>")), /not an allowed type/);
});

test("article media references include card, rich text, legacy body, and custom embeds", async () => {
  const { articleUsesMedia } = await import("../src/lib/server/content.mjs");
  const mediaId = "0123456789abcdef0123456789abcdef";
  assert.equal(articleUsesMedia({ cardMediaId: mediaId }, mediaId), true);
  assert.equal(articleUsesMedia({ content: { type: "doc", content: [{ type: "image", attrs: { src: `/media/${mediaId}` } }] } }, mediaId), true);
  assert.equal(articleUsesMedia({ body: [`[[image:${mediaId}]]`] }, mediaId), true);
  assert.equal(articleUsesMedia({ embed: { html: `<img src="/media/${mediaId}">` } }, mediaId), true);
  assert.equal(articleUsesMedia({ title: "Unused" }, mediaId), false);
});
