import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStore } from "../src/store.mjs";

test("content store seeds, persists, and returns defensive copies", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lp-store-"));
  const file = join(directory, "content.json");
  const store = createStore(file);
  await store.init();
  const first = store.read();
  first.profile.name = "Unsafe mutation";
  assert.equal(store.read().profile.name, "Lorenzo Pulcini");
  await store.update((data) => { data.profile.name = "Updated"; });
  assert.equal(store.read().profile.name, "Updated");
  assert.equal(JSON.parse(await readFile(file, "utf8")).profile.name, "Updated");
});
