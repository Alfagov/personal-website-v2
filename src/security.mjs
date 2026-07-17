import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const b64 = (value) => Buffer.from(value).toString("base64url");
const unb64 = (value) => Buffer.from(value, "base64url").toString("utf8");

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createSecurity({ secret, production, sessionTtlSeconds }) {
  const cookieNames = {
    session: production ? "__Host-lp_session" : "lp_session",
    oauth: production ? "__Host-lp_oauth" : "lp_oauth"
  };
  const sign = (value) => createHmac("sha256", secret).update(value).digest("base64url");

  function seal(payload) {
    const encoded = b64(JSON.stringify(payload));
    return `${encoded}.${sign(encoded)}`;
  }

  function unseal(token) {
    if (!token || token.length > 4096) return null;
    const [encoded, signature, extra] = token.split(".");
    if (!encoded || !signature || extra || !safeEqual(signature, sign(encoded))) return null;
    try {
      const payload = JSON.parse(unb64(encoded));
      const now = Math.floor(Date.now() / 1000);
      if (!payload || payload.v !== 1 || !Number.isInteger(payload.exp) || payload.exp <= now || payload.iat > now + 30) return null;
      return payload;
    } catch {
      return null;
    }
  }

  function cookie(name, value, { maxAge = null } = {}) {
    const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax"];
    if (production) parts.push("Secure");
    if (maxAge !== null) parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
    return parts.join("; ");
  }

  function clearCookie(name) {
    return cookie(name, "", { maxAge: 0 });
  }

  function parseCookies(header = "") {
    const result = {};
    for (const pair of header.split(";")) {
      const index = pair.indexOf("=");
      if (index < 1) continue;
      try { result[pair.slice(0, index).trim()] = decodeURIComponent(pair.slice(index + 1).trim()); } catch { /* Ignore malformed cookies. */ }
    }
    return result;
  }

  function createSession(user) {
    const now = Math.floor(Date.now() / 1000);
    const session = { v: 1, sub: String(user.id), login: user.login, name: user.name || user.login, avatar: user.avatar_url || "", iat: now, exp: now + sessionTtlSeconds, nonce: randomBytes(24).toString("base64url") };
    return { session, token: seal(session), csrf: sign(`csrf:${session.nonce}`) };
  }

  function readSession(request) {
    const token = parseCookies(request.headers.cookie)[cookieNames.session];
    const session = unseal(token);
    return session ? { ...session, csrf: sign(`csrf:${session.nonce}`) } : null;
  }

  function createOAuthState() {
    const now = Math.floor(Date.now() / 1000);
    const state = randomBytes(32).toString("base64url");
    return { state, token: seal({ v: 1, state, iat: now, exp: now + 600 }) };
  }

  function verifyOAuthState(request, returnedState) {
    const token = parseCookies(request.headers.cookie)[cookieNames.oauth];
    const payload = unseal(token);
    return Boolean(payload?.state && returnedState && safeEqual(payload.state, returnedState));
  }

  return { cookieNames, cookie, clearCookie, createSession, readSession, createOAuthState, verifyOAuthState, safeEqual };
}

export function securityHeaders({ production, csp }) {
  return {
    "Content-Security-Policy": csp,
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    ...(production ? { "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload" } : {})
  };
}
