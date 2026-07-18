import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { createStore } from "../../store.mjs";
import { createMediaStore } from "../../media.mjs";
import { createSecurity } from "../../security.mjs";

let appPromise;

function numberEnv(name, fallback, min, max) {
  const value = Number.parseInt(process.env[name] || String(fallback), 10);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${name} must be between ${min} and ${max}`);
  return value;
}

function normalizeOrigin(value) {
  const parsed = new URL(value);
  if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) throw new Error("APP_ORIGIN must be an http(s) origin without a path");
  return parsed.origin;
}

async function createApp() {
  const production = process.env.NODE_ENV === "production";
  const port = numberEnv("PORT", 3000, 1, 65535);
  const appOrigin = normalizeOrigin(process.env.APP_ORIGIN || process.env.ORIGIN || `http://localhost:${port}`);
  const sessionTtlSeconds = numberEnv("SESSION_TTL_SECONDS", 28_800, 900, 86_400);
  const sessionSecret = process.env.SESSION_SECRET || randomBytes(48).toString("base64url");
  const store = createStore(process.env.DATA_FILE || "./data/content.json");
  await store.init();
  const mediaStore = createMediaStore(join(dirname(store.path), "uploads"));
  await mediaStore.init();
  const security = createSecurity({ secret: sessionSecret, production, sessionTtlSeconds });
  const allowedUsers = new Set((process.env.GITHUB_ALLOWED_USERS || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean));
  const allowedIds = new Set((process.env.GITHUB_ALLOWED_IDS || "").split(",").map((value) => value.trim()).filter(Boolean));
  return {
    production,
    appOrigin,
    sessionTtlSeconds,
    store,
    mediaStore,
    security,
    allowedUsers,
    allowedIds,
    oauthConfigured: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)
  };
}

export function getApp() {
  appPromise ||= createApp();
  return appPromise;
}

export function requestLike(request) {
  return { headers: { cookie: request.headers.get("cookie") || "", origin: request.headers.get("origin") || "" } };
}

export async function readUser(request) {
  const { security } = await getApp();
  return security.readSession(requestLike(request));
}

export function publicError(status, message) {
  const error = new Error(message);
  error.status = status;
  error.expose = true;
  return error;
}
