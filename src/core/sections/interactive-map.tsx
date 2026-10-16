"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";
import { OsmMap } from "./osm-map";

/**
 * Interactive map of the Surroundings section (Leaflet + OpenStreetMap tiles): zoom and pan, no cookies, no key.
 * The library loads only when the map comes near the screen; until then the static map stands in its place.
 * Wheel zoom starts after a click into the map, so scrolling the page never gets stuck in it.
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
    let map: import("leaflet").Map | null = null;
    let cancelled = false;
    const io = new IntersectionObserver(
      async ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        const L = (await import("leaflet")).default;
        if (cancelled || !ref.current) return;
        const accent2 =
          getComputedStyle(document.documentElement).getPropertyValue("--brand-secondary").trim() ||
          "#ad5a2b";
        map = L.map(ref.current, {
          scrollWheelZoom: false,
          zoomControl: false,
          attributionControl: true,
        }).setView([latitude, longitude], zoom);
        L.control.zoom({ zoomInTitle: zoomLabels.in, zoomOutTitle: zoomLabels.out }).addTo(map);
        const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
        });
        // Swap the static preview for the live map only once its tiles are there (never an empty box).
        const show = () => !cancelled && setReady(true);
        tiles.once("tileload", show);
        window.setTimeout(show, 4000); // slow network: show the live map anyway
        tiles.addTo(map);
        if (approximate) {
          L.circle([latitude, longitude], {
            radius: 900,
            color: accent2,
            weight: 2,
            fillColor: accent2,
            fillOpacity: 0.18,
          }).addTo(map);
        } else {
          L.marker([latitude, longitude], {
            keyboard: false,
            icon: L.divIcon({
              className: "",
              iconSize: [28, 36],
              iconAnchor: [14, 36],
              html: `<svg viewBox="0 0 24 32" width="28" height="36" aria-hidden="true"><path fill="${accent2}" d="M12 0C5.4 0 0 5.2 0 11.7 0 20.4 12 32 12 32s12-11.6 12-20.3C24 5.2 18.6 0 12 0Z"/><circle cx="12" cy="11.5" r="4.5" fill="#fff"/></svg>`,
            }),
          }).addTo(map);
        }
        map.on("click focus", () => map?.scrollWheelZoom.enable());
        map.on("mouseout blur", () => map?.scrollWheelZoom.disable());
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
        <OsmMap
          latitude={latitude}
          longitude={longitude}
          approximate={approximate}
          zoom={zoom}
          label={label}
          className="absolute inset-0"
        />
      ) : null}
      <div
        ref={ref}
        role="region"
        aria-label={label}
        className={cn("absolute inset-0 z-0", !ready && "invisible")}
      />
    </div>
  );
}
