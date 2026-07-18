import { error } from "@sveltejs/kit";
import { getApp } from "$lib/server/app.mjs";

export async function POST({ request, locals }) {
  const app = await getApp();
  if (!locals.user) throw error(401, "Sign in required");
  const form = await request.formData();
  if (!app.security.safeEqual(form.get("csrf") || "", locals.user.csrf)) throw error(403, "Invalid request token");
  return new Response(null, { status: 303, headers: { location: "/admin", "set-cookie": app.security.clearCookie(app.security.cookieNames.session), "cache-control": "no-store" } });
}
