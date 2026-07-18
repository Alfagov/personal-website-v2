import { getApp } from "$lib/server/app.mjs";

export async function load() {
  const { store } = await getApp();
  return store.read();
}
