import { cn } from "@/lib/utils";

/**
 * Map preview without any map data (Z40): a soft drawn background with the pin (or an area for an approximate
 * location). It costs no request and no script — the small map by the price and the place holder of the
 * interactive map until MapLibre loads near the screen. OpenFreeMap has no static images and OSM tiles may not be
 * used commercially, so the real map is only the interactive one.
 */
export function MapPreview({
  approximate,
  className,
  label,
}: {
  approximate: boolean;
  className?: string;
  label: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn("relative overflow-hidden bg-[#eef0ec]", className)}
    >
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 400 200"
      >
        <path
          d="M0 150 C80 120 140 170 220 130 S340 60 400 80"
          stroke="#d9ddd6"
          strokeWidth="14"
          fill="none"
        />
        <path
          d="M-10 40 C60 70 120 30 200 60 S330 120 410 100"
          stroke="#e3e6e0"
          strokeWidth="8"
          fill="none"
        />
        <path d="M120 -10 C130 60 110 120 140 210" stroke="#e6e8e3" strokeWidth="6" fill="none" />
        <path d="M290 -10 C280 50 300 140 270 210" stroke="#e6e8e3" strokeWidth="6" fill="none" />
        <path
          d="M30 0 C200 80 230 120 400 190"
          stroke="#cfdccb"
          strokeWidth="3"
          fill="none"
          opacity="0.7"
        />
      </svg>
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
    </div>
  );
}
