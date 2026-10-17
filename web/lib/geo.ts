/** Utilidades geográficas para el módulo GPS. */

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

/** Distancia en km entre dos puntos (fórmula de haversine). */
export function haversineKm(a: LatLng, b: LatLng) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Saltos mayores a esto entre dos puntos consecutivos se consideran errores del GPS. */
export const MAX_JUMP_KM = 2;

/** Kilómetros recorridos sumando tramos e ignorando saltos imposibles. */
export function routeDistanceKm(points: LatLng[]) {
  let km = 0;
  for (let i = 1; i < points.length; i++) {
    const d = haversineKm(points[i - 1], points[i]);
    if (d <= MAX_JUMP_KM) km += d;
  }
  return Math.round(km * 10) / 10;
}

/** Velocidad promedio en movimiento (ignora los puntos detenidos). */
export function averageMovingSpeed(speeds: (number | null | undefined)[], minKmh = 3) {
  const moving = speeds.filter((s): s is number => typeof s === "number" && s >= minKmh);
  if (!moving.length) return null;
  return Math.round((moving.reduce((a, b) => a + b, 0) / moving.length) * 10) / 10;
}

export type BusGpsState = "moving" | "stopped" | "stale" | "no_gps";

/** Un punto GPS con más de 10 minutos se considera desactualizado. */
export const STALE_POSITION_MS = 10 * 60 * 1000;

export function busGpsState(
  position: { lat: number | null; position_at: string | null; speed_kmh: number | null },
  now = Date.now(),
): BusGpsState {
  if (position.lat == null || !position.position_at) return "no_gps";
  if (now - new Date(position.position_at).getTime() > STALE_POSITION_MS) return "stale";
  return (position.speed_kmh ?? 0) >= 3 ? "moving" : "stopped";
}

export const GPS_STATE_LABELS: Record<BusGpsState, string> = {
  moving: "En movimiento",
  stopped: "Detenido",
  stale: "Sin señal reciente",
  no_gps: "Sin GPS",
};

/** Límites [[sur, oeste], [norte, este]] que contienen todos los puntos. */
export function boundsOf(points: LatLng[]): [[number, number], [number, number]] | null {
  if (!points.length) return null;
  let s = Infinity,
    w = Infinity,
    n = -Infinity,
    e = -Infinity;
  for (const p of points) {
    s = Math.min(s, p.lat);
    n = Math.max(n, p.lat);
    w = Math.min(w, p.lng);
    e = Math.max(e, p.lng);
  }
  return [
    [s, w],
    [n, e],
  ];
}

/** Enlace para abrir una coordenada en OpenStreetMap. */
export function osmLink(lat: number, lng: number, zoom = 17) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;
}
