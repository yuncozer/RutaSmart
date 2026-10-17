"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import { useTheme } from "next-themes";
import { boundsOf, type LatLng } from "@/lib/geo";

export type MarkerTone = "moving" | "stopped" | "stale";

export interface BusMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  detail?: string;
  tone: MarkerTone;
}

export interface DotPoint {
  lat: number;
  lng: number;
  kind: "in" | "out";
}

export interface Hotspot {
  lat: number;
  lng: number;
  ins: number;
  outs: number;
  total: number;
}

/**
 * Mapas base: OpenStreetMap (sin API key). Para producción con mucho tráfico,
 * definir NEXT_PUBLIC_MAP_TILE_URL con un proveedor con clave (MapTiler, Stadia…).
 */
const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const TONE_COLORS: Record<MarkerTone, string> = {
  moving: "#16a34a",
  stopped: "#3b5ba5",
  stale: "#94a3b8",
};
const IN_COLOR = "#3b5ba5";
const OUT_COLOR = "#d97706";

function busIcon(marker: BusMarker, selected: boolean) {
  const color = TONE_COLORS[marker.tone];
  const pulse =
    marker.tone === "moving"
      ? `<span style="position:absolute;inset:-6px;border-radius:9999px;background:${color};opacity:.25;animation:rs-ping 2s ease-out infinite"></span>`
      : "";
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    html: `
      <div style="position:relative;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center">
        <div style="position:relative;display:flex;align-items:center;gap:6px;padding:4px 8px 4px 4px;border-radius:9999px;background:#0b1f3a;color:#fff;font:600 11px/1 var(--font-geist-sans),system-ui;box-shadow:0 6px 16px rgba(6,18,42,.35);white-space:nowrap;${selected ? "outline:2px solid #f5a524;outline-offset:2px;" : ""}">
          <span style="position:relative;display:grid;place-items:center;width:20px;height:20px;border-radius:9999px;background:${color}">
            ${pulse}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>
          </span>
          ${escapeHtml(marker.label)}
        </div>
        <span style="width:2px;height:8px;background:#0b1f3a"></span>
      </div>`,
  });
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

/** Ajusta la vista a los datos (una sola vez por cambio de datos). */
function FitToData({ points, focus }: { points: LatLng[]; focus?: LatLng | null }) {
  const map = useMap();
  const bounds = useMemo(() => boundsOf(points), [points]);
  useEffect(() => {
    if (focus) {
      map.flyTo([focus.lat, focus.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
      return;
    }
    if (!bounds) return;
    if (bounds[0][0] === bounds[1][0] && bounds[0][1] === bounds[1][1]) {
      map.setView(bounds[0], 15);
    } else {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [map, bounds, focus]);
  return null;
}

export interface MapViewProps {
  buses?: BusMarker[];
  selectedBusId?: string | null;
  onSelectBus?: (id: string) => void;
  route?: LatLng[];
  dots?: DotPoint[];
  hotspots?: Hotspot[];
  focus?: LatLng | null;
  className?: string;
}

export default function MapView({
  buses = [],
  selectedBusId,
  onSelectBus,
  route = [],
  dots = [],
  hotspots = [],
  focus,
  className,
}: MapViewProps) {
  const { resolvedTheme } = useTheme();

  const fitPoints = useMemo<LatLng[]>(() => {
    if (route.length) return route;
    if (buses.length) return buses;
    if (hotspots.length) return hotspots;
    return dots;
  }, [route, buses, hotspots, dots]);

  const maxHotspot = Math.max(1, ...hotspots.map((h) => h.total));
  const center: [number, number] = fitPoints[0]
    ? [fitPoints[0].lat, fitPoints[0].lng]
    : [7.77, -72.22];

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom
      className={className}
      style={{ height: "100%", width: "100%", background: "var(--muted)" }}
    >
      <TileLayer
        url={TILE_URL}
        attribution={ATTRIBUTION}
        maxZoom={19}
        // En modo oscuro se invierten los colores del mapa base (los datos mantienen sus colores)
        className={resolvedTheme === "dark" ? "rs-tiles-dark" : undefined}
      />
      <FitToData points={fitPoints} focus={focus} />

      {route.length > 1 ? (
        <>
          <Polyline
            positions={route.map((p) => [p.lat, p.lng])}
            pathOptions={{ color: "#06122a", weight: 7, opacity: 0.25 }}
          />
          <Polyline
            positions={route.map((p) => [p.lat, p.lng])}
            pathOptions={{ color: "#5b8cff", weight: 4, opacity: 0.95 }}
          />
        </>
      ) : null}

      {hotspots.map((h, i) => (
        <CircleMarker
          key={`h-${i}`}
          center={[h.lat, h.lng]}
          radius={8 + 22 * Math.sqrt(h.total / maxHotspot)}
          pathOptions={{ color: "#f5a524", weight: 1.5, fillColor: "#f5a524", fillOpacity: 0.28 }}
        >
          <Tooltip direction="top">
            <strong>#{i + 1}</strong> · {h.ins} suben · {h.outs} bajan
          </Tooltip>
        </CircleMarker>
      ))}

      {dots.map((d, i) => (
        <CircleMarker
          key={`d-${i}`}
          center={[d.lat, d.lng]}
          radius={3.5}
          pathOptions={{
            color: "#ffffff",
            weight: 1,
            fillColor: d.kind === "in" ? IN_COLOR : OUT_COLOR,
            fillOpacity: 0.9,
          }}
        />
      ))}

      {buses.map((b) => (
        <Marker
          key={b.id}
          position={[b.lat, b.lng]}
          icon={busIcon(b, b.id === selectedBusId)}
          eventHandlers={onSelectBus ? { click: () => onSelectBus(b.id) } : undefined}
        >
          {b.detail ? (
            <Tooltip direction="top" offset={[0, -36]}>
              {b.detail}
            </Tooltip>
          ) : null}
        </Marker>
      ))}
    </MapContainer>
  );
}
