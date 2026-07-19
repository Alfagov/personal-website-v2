import test from "node:test";
import assert from "node:assert/strict";
import { handleContentWrite } from "../src/lib/server/content.mjs";

function reorderFixture() {
  const data = { articles: [{ id: "first" }, { id: "second" }, { id: "third" }] };
  return {
    data,
    app: {
      store: {
        async update(mutator) {
          await mutator(data);
          return structuredClone(data);
        }
      }
    }
  };
}

test("article reordering persists the requested display order", async () => {
  const { app, data } = reorderFixture();
  const form = new FormData();
  form.set("id", "second");
  form.set("direction", "up");
  await handleContentWrite(app, "articles:reorder", form);
  assert.deepEqual(data.articles.map((article) => article.id), ["second", "first", "third"]);

  form.set("direction", "down");
  await handleContentWrite(app, "articles:reorder", form);
  assert.deepEqual(data.articles.map((article) => article.id), ["first", "second", "third"]);
});

test("article reordering rejects invalid directions", async () => {
  const { app } = reorderFixture();
  const form = new FormData();
  form.set("id", "second");
  form.set("direction", "sideways");
  await assert.rejects(() => handleContentWrite(app, "articles:reorder", form), /Invalid article order direction/);
});
