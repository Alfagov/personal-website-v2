import { loadEnvFile } from "node:process";

// Node does not load .env files automatically for production builds. Load one
// when present, while preserving values already supplied by Docker or the host.
try {
  loadEnvFile();
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const required = ["APP_ORIGIN", "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "SESSION_SECRET"];
const missing = required.filter((name) => !String(process.env[name] || "").trim());
if (process.env.NODE_ENV === "production" && missing.length) {
  throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
}
if (process.env.NODE_ENV === "production" && !String(process.env.GITHUB_ALLOWED_USERS || "").trim() && !String(process.env.GITHUB_ALLOWED_IDS || "").trim()) {
  throw new Error("Set GITHUB_ALLOWED_USERS or GITHUB_ALLOWED_IDS before starting in production");
}

// SvelteKit's Node adapter uses ORIGIN for same-origin form protection.
// Keep the project's existing APP_ORIGIN setting as the single source of truth.
if (!process.env.ORIGIN && process.env.APP_ORIGIN) {
  process.env.ORIGIN = process.env.APP_ORIGIN;
}

await import("./build/index.js");
