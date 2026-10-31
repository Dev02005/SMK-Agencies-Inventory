"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

/** Leaflet puts string content in as HTML, so names from the database go in as text nodes instead. */
function textNode(...lines: { text: string; strong?: boolean }[]) {
  const box = document.createElement("div");
  lines.forEach((line, i) => {
    if (i) box.appendChild(document.createElement("br"));
    const el = document.createElement(line.strong ? "strong" : "span");
    el.textContent = line.text;
    box.appendChild(el);
  });
  return box;
}

export type MapVehicle = { id: string; label: string; lat: number; lng: number; status: "moving" | "stopped" | "offline"; place: string; updatedAt: string; speedKmh: number };

/**
 * Leaflet map on OpenStreetMap tiles (light, free). Vehicles are circle markers so no image assets are needed;
 * today's lorry route is a dashed teal line. Leaflet needs the browser, so it is loaded inside the effect.
 */
export function FleetMap({ vehicles, route, places }: { vehicles: MapVehicle[]; route: [number, number][]; places: { name: string; lat: number; lng: number }[] }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !el.current) return;
      map = L.map(el.current, { scrollWheelZoom: false, attributionControl: true }).setView([18.45, 84.08], 10);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      for (const p of places) {
        L.circleMarker([p.lat, p.lng], { radius: 4, color: "#86868b", weight: 1, fillColor: "#ffffff", fillOpacity: 1 })
          .bindTooltip(textNode({ text: p.name }), { direction: "right", offset: [6, 0], className: "ska-map-label" })
          .addTo(map);
      }
      if (route.length > 1) {
        L.polyline(route, { color: "#0e7c86", weight: 4, opacity: 0.75, dashArray: "8 8" }).addTo(map);
      }
      for (const v of vehicles) {
        const color = v.status === "moving" ? "#0e7c86" : v.status === "stopped" ? "#6e6e73" : "#d70015";
        L.circleMarker([v.lat, v.lng], { radius: 10, color: "#ffffff", weight: 3, fillColor: color, fillOpacity: 1 })
          .bindTooltip(textNode({ text: v.label }), { permanent: true, direction: "top", offset: [0, -10], className: "ska-map-vehicle" })
          .bindPopup(
            textNode(
              { text: v.label, strong: true },
              { text: v.place },
              { text: `${v.status === "moving" ? `${v.speedKmh} km/h` : v.status} · ${v.updatedAt}` },
            ),
          )
          .addTo(map);
      }
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [vehicles, route, places]);

  return <div ref={el} className="h-[420px] w-full overflow-hidden rounded-card border border-hairline md:h-[520px]" role="region" aria-label="Map of vehicles" />;
}
