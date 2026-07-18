import { getApp } from "$lib/server/app.mjs";

export async function load({ locals }) {
  const { store } = await getApp();
  return { profile: store.read().profile, user: locals.user || null };
}
