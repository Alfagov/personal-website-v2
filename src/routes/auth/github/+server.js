import { error } from "@sveltejs/kit";
import { getApp } from "$lib/server/app.mjs";

export async function GET() {
  const app = await getApp();
  if (!app.oauthConfigured) throw error(503, "GitHub authentication is not configured");
  const { state, token } = app.security.createOAuthState();
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", `${app.appOrigin}/auth/github/callback`);
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("allow_signup", "false");
  return new Response(null, { status: 303, headers: { location: authorize.toString(), "set-cookie": app.security.cookie(app.security.cookieNames.oauth, token, { maxAge: 600 }), "cache-control": "no-store" } });
}
