import test from "node:test";
import assert from "node:assert/strict";
import { createSecurity } from "../src/security.mjs";

const security = createSecurity({ secret: "a-secure-test-secret-that-is-long-enough-1234567890", production: false, sessionTtlSeconds: 3600 });

test("session cookies round-trip and expose a CSRF token", () => {
  const created = security.createSession({ id: 42, login: "Alfagov", name: "Lorenzo" });
  const request = { headers: { cookie: `lp_session=${encodeURIComponent(created.token)}` } };
  const session = security.readSession(request);
  assert.equal(session.sub, "42");
  assert.equal(session.login, "Alfagov");
  assert.equal(session.csrf, created.csrf);
});

test("tampered session tokens are rejected", () => {
  const created = security.createSession({ id: 42, login: "Alfagov" });
  const tampered = `${created.token.slice(0, -1)}x`;
  assert.equal(security.readSession({ headers: { cookie: `lp_session=${tampered}` } }), null);
});

test("OAuth state is single-purpose and signed", () => {
  const created = security.createOAuthState();
  const request = { headers: { cookie: `lp_oauth=${encodeURIComponent(created.token)}` } };
  assert.equal(security.verifyOAuthState(request, created.state), true);
  assert.equal(security.verifyOAuthState(request, `${created.state}x`), false);
});

test("production cookies use the __Host prefix and secure attributes", () => {
  const prod = createSecurity({ secret: "a-secure-test-secret-that-is-long-enough-1234567890", production: true, sessionTtlSeconds: 3600 });
  assert.equal(prod.cookieNames.session, "__Host-lp_session");
  const value = prod.cookie(prod.cookieNames.session, "token", { maxAge: 60 });
  assert.match(value, /Path=\/; HttpOnly; SameSite=Lax; Secure; Max-Age=60/);
  assert.doesNotMatch(value, /Domain=/);
});
