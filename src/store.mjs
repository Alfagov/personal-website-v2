import { chmod, mkdir, open, readFile, rename, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { defaultData } from "./default-data.mjs";

const clone = (value) => structuredClone(value);

export function createStore(filePath) {
  const target = resolve(filePath);
  let current;
  let writeQueue = Promise.resolve();

  async function persist(value) {
    const temp = `${target}.${process.pid}.tmp`;
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    const handle = await open(temp, "w", 0o600);
    try {
      await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temp, target);
  }

  async function init() {
    try {
      const raw = await readFile(target, "utf8");
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !parsed.profile || !Array.isArray(parsed.articles)) throw new Error("invalid content shape");
      current = parsed;
    } catch (error) {
      if (error.code !== "ENOENT") throw new Error(`Could not load content store: ${error.message}`);
      current = clone(defaultData);
      await persist(current);
    }
    const info = await stat(target);
    if (!info.isFile()) throw new Error("DATA_FILE must point to a regular file");
    await chmod(target, 0o600);
    return api;
  }

  function read() {
    return clone(current);
  }

  async function update(mutator) {
    writeQueue = writeQueue.then(async () => {
      const draft = clone(current);
      await mutator(draft);
      await persist(draft);
      current = draft;
    });
    await writeQueue;
    return read();
  }

  async function replace(value) {
    const replacement = clone(value);
    writeQueue = writeQueue.then(async () => {
      await persist(replacement);
      current = replacement;
    });
    await writeQueue;
    return read();
  }

  const api = { init, read, update, replace, path: target };
  return api;
}
