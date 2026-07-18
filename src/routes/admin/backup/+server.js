import { error } from "@sveltejs/kit";
import { createBackup } from "../../../backup.mjs";
import { getApp } from "$lib/server/app.mjs";

export async function GET({ locals }) {
  if (!locals.user) throw error(401, "Sign in required");
  const { store } = await getApp();
  const body = `${JSON.stringify(createBackup(store.read()), null, 2)}\n`;
  return new Response(body, { headers: { "content-type": "application/json; charset=utf-8", "content-disposition": "attachment; filename=lorenzo-portfolio-backup.json", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } });
}
