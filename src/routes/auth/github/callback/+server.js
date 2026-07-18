import { error } from "@sveltejs/kit";
import { getApp, requestLike } from "$lib/server/app.mjs";

async function exchangeGitHubCode(app, code) {
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": "lorenzo-pulcini-portfolio" },
    body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code, redirect_uri: `${app.appOrigin}/auth/github/callback` }),
    signal: AbortSignal.timeout(10_000)
  });
  const tokenPayload = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenPayload.access_token) throw error(502, "GitHub sign-in could not be completed");
  const userResponse = await fetch("https://api.github.com/user", { headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${tokenPayload.access_token}`, "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "lorenzo-pulcini-portfolio" }, signal: AbortSignal.timeout(10_000) });
  const user = await userResponse.json();
  if (!userResponse.ok || !user.id || !user.login) throw error(502, "GitHub identity could not be verified");
  return user;
}

export async function GET({ request, url }) {
  const app = await getApp();
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || code.length > 512 || !app.security.verifyOAuthState(requestLike(request), state)) throw error(400, "Invalid or expired GitHub sign-in");
  const user = await exchangeGitHubCode(app, code);
  if (!app.allowedUsers.has(user.login.toLowerCase()) && !app.allowedIds.has(String(user.id))) throw error(403, "This GitHub account is not authorized");
  const created = app.security.createSession(user);
  const headers = new Headers({ location: "/admin", "cache-control": "no-store" });
  headers.append("set-cookie", app.security.clearCookie(app.security.cookieNames.oauth));
  headers.append("set-cookie", app.security.cookie(app.security.cookieNames.session, created.token, { maxAge: app.sessionTtlSeconds }));
  return new Response(null, { status: 303, headers });
}
