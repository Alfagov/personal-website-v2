import { getApp } from "$lib/server/app.mjs";
export async function load() { return (await getApp()).store.read(); }
