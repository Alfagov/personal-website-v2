import { dev } from "$app/environment";
import { getApp, requestLike } from "$lib/server/app.mjs";

export async function handle({ event, resolve }) {
  const app = await getApp();
  event.locals.user = app.security.readSession(requestLike(event.request));
  const response = await resolve(event);
  const isSandbox = event.url.pathname.startsWith("/figures/") || event.url.pathname.startsWith("/article-content/");
  const csp = dev
    ? "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob: https://avatars.githubusercontent.com; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' ws:; font-src 'self' data:; frame-src 'self' blob:"
    : "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob: https://avatars.githubusercontent.com; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self' data:; frame-src 'self' blob:";
  if (!isSandbox) response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  if (!isSandbox) response.headers.set("X-Frame-Options", "DENY");
  if (app.production) response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  return response;
}
