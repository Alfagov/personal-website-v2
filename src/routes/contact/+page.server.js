import { getApp } from "$lib/server/app.mjs";
export async function load() { return { profile: (await getApp()).store.read().profile }; }
