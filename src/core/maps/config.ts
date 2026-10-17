/**
 * Maps (Z40, ROZHODNUTIA 17. 10.): vector tiles from OpenFreeMap (free also commercially, no key, no cookies) drawn
 * by MapLibre GL. The style URL is the one place to change when OpenFreeMap goes away or we host the tiles ourselves.
 */
export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/positron";

/** "Navigovať v Google Mapách" — a plain link, no key and nothing from Google loaded on the page. */
export function googleDirectionsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}
