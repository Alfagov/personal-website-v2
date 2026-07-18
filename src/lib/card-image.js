export const DEFAULT_CARD_IMAGE = Object.freeze({
  aspectRatio: "16-9",
  objectFit: "cover",
  positionX: 50,
  positionY: 50,
  zoom: 100
});

const RATIOS = new Set(["16-9", "3-2", "4-3", "1-1", "3-4"]);
const FITS = new Set(["cover", "contain"]);

export function sanitizeCardImage(value) {
  if (value === undefined || value === null) return { ...DEFAULT_CARD_IMAGE };
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid article card image settings");
  const aspectRatio = String(value.aspectRatio || "");
  const objectFit = String(value.objectFit || "");
  const positionX = Number(value.positionX);
  const positionY = Number(value.positionY);
  const zoom = Number(value.zoom);
  if (!RATIOS.has(aspectRatio) || !FITS.has(objectFit)) throw new Error("Invalid article card image settings");
  if (![positionX, positionY, zoom].every(Number.isInteger) || positionX < 0 || positionX > 100 || positionY < 0 || positionY > 100 || zoom < 100 || zoom > 220) throw new Error("Invalid article card image crop settings");
  return { aspectRatio, objectFit, positionX, positionY, zoom };
}

export function cardImageOrDefault(value) {
  try { return sanitizeCardImage(value); }
  catch { return { ...DEFAULT_CARD_IMAGE }; }
}

export function cardImageStyle(value) {
  const settings = cardImageOrDefault(value);
  return `--card-x:${settings.positionX}%;--card-y:${settings.positionY}%;--card-zoom:${settings.zoom / 100};--card-fit:${settings.objectFit}`;
}
