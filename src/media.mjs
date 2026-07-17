import { mkdir, open, readFile, rename } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { randomBytes } from "node:crypto";

const TYPES = {
  png: { mime: "image/png", signature: (data) => data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  jpg: { mime: "image/jpeg", signature: (data) => data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff },
  gif: { mime: "image/gif", signature: (data) => data.length >= 6 && (data.subarray(0, 6).toString("ascii") === "GIF87a" || data.subarray(0, 6).toString("ascii") === "GIF89a") },
  webp: { mime: "image/webp", signature: (data) => data.length >= 12 && data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP" },
  pdf: { mime: "application/pdf", signature: (data) => data.length >= 5 && data.subarray(0, 5).toString("ascii") === "%PDF-" }
};

export function createMediaStore(directory) {
  const target = resolve(directory);

  async function init() { await mkdir(target, { recursive: true, mode: 0o700 }); }
  function inspect(data, allowed = Object.keys(TYPES)) {
    for (const extension of allowed) {
      const type = TYPES[extension];
      if (type?.signature(data)) return { extension, mime: type.mime };
    }
    throw new Error("The uploaded file is not an allowed type");
  }
  async function save(data, allowed) {
    const type = inspect(data, allowed);
    const id = randomBytes(16).toString("hex");
    const filename = `${id}.${type.extension}`;
    const finalPath = join(target, filename);
    const temporary = `${finalPath}.${process.pid}.tmp`;
    const handle = await open(temporary, "w", 0o600);
    try { await handle.writeFile(data); await handle.sync(); } finally { await handle.close(); }
    await rename(temporary, finalPath);
    return { id, filename, mime: type.mime, size: data.length, createdAt: new Date().toISOString() };
  }
  async function read(filename) {
    const clean = basename(filename);
    if (!/^[a-f0-9]{32}\.(png|jpg|gif|webp|pdf)$/.test(clean)) return null;
    try { return await readFile(join(target, clean)); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
  }
  return { init, inspect, save, read, directory: target };
}
