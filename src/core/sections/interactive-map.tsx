"use client";

import { useEffect, useRef, useState } from "react";
import { MAP_STYLE_URL } from "@/core/maps/config";
import { cn } from "@/lib/utils";
import { MapPreview } from "./map-preview";

const PIN = (color: string) =>
  `<svg viewBox="0 0 24 32" width="28" height="36" aria-hidden="true"><path fill="${color}" d="M12 0C5.4 0 0 5.2 0 11.7 0 20.4 12 32 12 32s12-11.6 12-20.3C24 5.2 18.6 0 12 0Z"/><circle cx="12" cy="11.5" r="4.5" fill="#fff"/></svg>`;

/** Polygon of a circle of `meters` around a point (an approximate location shows an area, never the house). */
function circle(longitude: number, latitude: number, meters: number) {
  const points: [number, number][] = [];
  const dLat = meters / 111_320;
  const dLng = meters / (111_320 * Math.cos((latitude * Math.PI) / 180));
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * 2 * Math.PI;
    points.push([longitude + dLng * Math.cos(a), latitude + dLat * Math.sin(a)]);
  }
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "Polygon" as const, coordinates: [points] },
  };
}

/**
 * Interactive map of the Surroundings section (Z40): OpenFreeMap vector tiles drawn by MapLibre GL — zoom and pan,
 * no cookies, no key. The library loads only when the map comes near the screen; until then the drawn preview
 * stands in its place. Wheel zoom starts after a click into the map, so scrolling the page never gets stuck in it.
 */
export function InteractiveMap({
  latitude,
  longitude,
  approximate,
  zoom,
  label,
  zoomLabels,
  className,
}: {
  latitude: number;
  longitude: number;
  approximate: boolean;
  zoom: number;
  label: string;
  zoomLabels: { in: string; out: string };
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let map: import("maplibre-gl").Map | null = null;
    let cancelled = false;
    const io = new IntersectionObserver(
      async ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        const [{ default: maplibregl }] = await Promise.all([
          import("maplibre-gl"),
          import("maplibre-gl/dist/maplibre-gl.css"),
        ]);
        if (cancelled || !ref.current) return;
        const accent2 =
          getComputedStyle(document.documentElement).getPropertyValue("--brand-secondary").trim() ||
          "#ad5a2b";
        const m = new maplibregl.Map({
          container: ref.current,
          style: MAP_STYLE_URL,
          center: [longitude, latitude],
          zoom,
          scrollZoom: false,
          dragRotate: false,
          pitchWithRotate: false,
          attributionControl: { compact: true },
          locale: {
            "NavigationControl.ZoomIn": zoomLabels.in,
            "NavigationControl.ZoomOut": zoomLabels.out,
          },
        });
        map = m;
        m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
        m.touchZoomRotate.disableRotation();
        const show = () => !cancelled && setReady(true);
        window.setTimeout(show, 6000); // slow network: show the live map anyway
        m.on("load", () => {
          if (approximate) {
            m.addSource("area", { type: "geojson", data: circle(longitude, latitude, 900) });
            m.addLayer({
              id: "area-fill",
              type: "fill",
              source: "area",
              paint: { "fill-color": accent2, "fill-opacity": 0.18 },
            });
            m.addLayer({
              id: "area-line",
              type: "line",
              source: "area",
              paint: { "line-color": accent2, "line-width": 2 },
            });
          } else {
            const pin = document.createElement("div");
            pin.innerHTML = PIN(accent2);
            new maplibregl.Marker({ element: pin, anchor: "bottom" })
              .setLngLat([longitude, latitude])
              .addTo(m);
          }
          show();
        });
        m.on("click", () => m.scrollZoom.enable());
        ref.current.addEventListener("mouseleave", () => m.scrollZoom.disable());
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
      map?.remove();
    };
  }, [latitude, longitude, approximate, zoom, zoomLabels.in, zoomLabels.out]);

  return (
    <div className={cn("relative isolate overflow-hidden", className)}>
      {!ready ? (
        <MapPreview approximate={approximate} label={label} className="absolute inset-0" />
      ) : null}
      <div
        role="region"
        aria-label={label}
        className={cn("absolute inset-0 z-0", !ready && "invisible")}
      >
        {/* MapLibre adds its own elements here — React must never re-render its content. */}
        <div ref={ref} className="h-full w-full" />
      </div>
    </div>
  );
}
