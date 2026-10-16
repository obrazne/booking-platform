import { cn } from "@/lib/utils";

const TILE = 256;

/** Web Mercator tile coordinates (fractional) of a point. */
function tileXY(lat: number, lng: number, zoom: number) {
  const n = 2 ** zoom;
  const rad = (lat * Math.PI) / 180;
  return {
    x: ((lng + 180) / 360) * n,
    y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n,
  };
}

/**
 * Static map from OpenStreetMap tiles (B1 v2): no script, no cookies, no paid key. The point is in the middle;
 * an approximate location shows an area instead of a pin. Tiles are loaded by the guest's browser from OSM.
 */
export function OsmMap({
  latitude,
  longitude,
  approximate,
  zoom = 13,
  className,
  label,
  linkAttribution = true,
  small = false,
}: {
  latitude: number;
  longitude: number;
  approximate: boolean;
  zoom?: number;
  className?: string;
  label: string;
  /** False inside another link (the attribution is then plain text — no nested links). */
  linkAttribution?: boolean;
  /** Small map (≤ 400 × 200 px): 3 × 3 tiles instead of 5 × 3. */
  small?: boolean;
}) {
  const { x, y } = tileXY(latitude, longitude, zoom);
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  const fx = (x - tx) * TILE;
  const fy = (y - ty) * TILE;
  const cols = small ? [-1, 0, 1] : [-2, -1, 0, 1, 2];
  const left = -cols[0]!;
  const rows = [-1, 0, 1];
  return (
    <div className={cn("relative overflow-hidden bg-[#e8eae6]", className)}>
      <div
        role="img"
        aria-label={label}
        className="absolute top-1/2 left-1/2"
        style={{ transform: `translate(${-(left * TILE + fx)}px, ${-(TILE + fy)}px)` }}
      >
        {rows.map((dy) =>
          cols.map((dx) => (
            // eslint-disable-next-line @next/next/no-img-element -- map tiles from OpenStreetMap
            <img
              key={`${dx}:${dy}`}
              src={`https://tile.openstreetmap.org/${zoom}/${tx + dx}/${ty + dy}.png`}
              alt=""
              width={TILE}
              height={TILE}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              className="absolute max-w-none"
              style={{ left: (dx + left) * TILE, top: (dy + 1) * TILE }}
            />
          )),
        )}
      </div>
      {approximate ? (
        <span className="bg-accent-2/20 border-accent-2 absolute top-1/2 left-1/2 size-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2" />
      ) : (
        <svg
          aria-hidden
          viewBox="0 0 24 32"
          className="text-accent-2 absolute top-1/2 left-1/2 h-9 w-7 -translate-x-1/2 -translate-y-full drop-shadow"
        >
          <path
            fill="currentColor"
            d="M12 0C5.4 0 0 5.2 0 11.7 0 20.4 12 32 12 32s12-11.6 12-20.3C24 5.2 18.6 0 12 0Z"
          />
          <circle cx="12" cy="11.5" r="4.5" fill="#fff" />
        </svg>
      )}
      {linkAttribution ? (
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
          className="absolute right-0 bottom-0 bg-white/85 px-1.5 py-0.5 text-[10px] text-[#5a6672]"
        >
          © OpenStreetMap
        </a>
      ) : (
        <span className="absolute right-0 bottom-0 bg-white/85 px-1.5 py-0.5 text-[10px] text-[#5a6672]">
          © OpenStreetMap
        </span>
      )}
    </div>
  );
}
