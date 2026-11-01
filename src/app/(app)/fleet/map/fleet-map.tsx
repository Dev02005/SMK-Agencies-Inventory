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

const statusColour: Record<MapVehicle["status"], string> = { moving: "#0e7c86", stopped: "#636368", offline: "#d70015" };

/** A vehicle's marker: a white pill with a coloured status dot and its number, pointing at the spot (styled in globals.css). */
function vehiclePin(v: MapVehicle) {
  const pin = document.createElement("div");
  pin.className = "ska-pin";
  pin.dataset.status = v.status;
  pin.style.setProperty("--pin", statusColour[v.status]);
  const dot = document.createElement("span");
  dot.className = "ska-pin-dot";
  const label = document.createElement("span");
  label.textContent = v.label;
  pin.append(dot, label);
  return pin;
}

/**
 * Leaflet map on OpenStreetMap tiles, dressed in the app's look (softer tiles, round controls, card popups;
 * see .ska-map in globals.css). Vehicles are pill markers drawn with HTML, so no image assets are needed;
 * today's lorry route is a dashed teal line. Leaflet needs the browser, so it is loaded inside the effect.
 */
export function FleetMap({ vehicles, route, places }: { vehicles: MapVehicle[]; route: [number, number][]; places: { name: string; lat: number; lng: number }[] }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !el.current) return;
      map = L.map(el.current, { scrollWheelZoom: false, attributionControl: true, zoomControl: false }).setView([18.45, 84.08], 10);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      for (const p of places) {
        L.circleMarker([p.lat, p.lng], { radius: 4, color: "#0068d1", weight: 2, fillColor: "#ffffff", fillOpacity: 1 })
          .bindTooltip(textNode({ text: p.name }), { direction: "right", offset: [6, 0], className: "ska-map-label" })
          .addTo(map);
      }
      if (route.length > 1) {
        L.polyline(route, { color: "#0e7c86", weight: 4, opacity: 0.75, dashArray: "8 8" }).addTo(map);
      }
      for (const v of vehicles) {
        // A zero-size icon at the spot; the pill draws itself above it.
        L.marker([v.lat, v.lng], { icon: L.divIcon({ html: vehiclePin(v), className: "", iconSize: [0, 0] }), title: v.label, riseOnHover: true })
          .bindPopup(
            textNode(
              { text: v.label, strong: true },
              { text: v.place },
              { text: `${v.status === "moving" ? `${v.speedKmh} km/h` : v.status} · ${v.updatedAt}` },
            ),
            { offset: [0, -30] },
          )
          .addTo(map);
      }
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [vehicles, route, places]);

  return <div ref={el} className="ska-map h-[420px] w-full overflow-hidden rounded-card border border-hairline shadow-card md:h-[520px]" role="region" aria-label="Map of vehicles" />;
}
