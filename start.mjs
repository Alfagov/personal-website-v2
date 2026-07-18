// SvelteKit's Node adapter uses ORIGIN for same-origin form protection.
// Keep the project's existing APP_ORIGIN setting as the single source of truth.
if (!process.env.ORIGIN && process.env.APP_ORIGIN) {
  process.env.ORIGIN = process.env.APP_ORIGIN;
}

await import("./build/index.js");
