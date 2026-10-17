import type { Rng } from "./rng.js";

export interface SimEvent {
  id: string;
  occurred_at: string;
  direction: "in" | "out";
  is_driver: boolean;
  confidence: number;
  lat: number;
  lng: number;
}

export interface SimPosition {
  id: string;
  recorded_at: string;
  lat: number;
  lng: number;
  speed_kmh: number;
  heading: number;
  accuracy_m: number;
  satellites: number;
}

export interface DayOptions {
  /** Fecha local YYYY-MM-DD */
  date: string;
  /** Desfase UTC de la zona local en horas (Caracas -4, Bogotá -5) */
  utcOffsetHours: number;
  /** No generar eventos posteriores a este instante */
  until?: Date;
  /** Ruta: origen y destino (lat, lng) */
  route?: { from: [number, number]; to: [number, number] };
  capacity?: number;
  /** Segundos entre puntos GPS mientras el bus se mueve (por defecto 30) */
  gpsIntervalS?: number;
}

const DEFAULT_ROUTE: DayOptions["route"] = { from: [7.7669, -72.225], to: [7.8146, -72.2002] };

/** Demanda relativa por hora local: picos de 6–8 am y 5–7 pm. */
export function demandFactor(hour: number) {
  if (hour >= 6 && hour < 8) return 1.0;
  if (hour >= 17 && hour < 19) return 0.95;
  if (hour === 8 || hour === 16 || hour === 19) return 0.6;
  if (hour >= 11 && hour < 14) return 0.5;
  if (hour >= 9 && hour < 17) return 0.35;
  return 0.15;
}

/** Paradas fijas por ruta: así las subidas se agrupan en lugares reales. */
const STOPS_PER_TRIP = 14;

/**
 * Simula un día de operación de un bus: viajes ida/vuelta con 14 paradas,
 * subidas según demanda horaria y bajadas coherentes (nunca bajan más pasajeros
 * de los que van a bordo; al final del viaje bajan todos), cruces del conductor
 * y el recorrido GPS (un punto cada `gpsIntervalS` segundos en movimiento).
 */
export function simulateDayFull(
  rng: Rng,
  opts: DayOptions,
): { events: SimEvent[]; positions: SimPosition[] } {
  const route = opts.route ?? DEFAULT_ROUTE!;
  const capacity = opts.capacity ?? 40;
  const gpsStep = (opts.gpsIntervalS ?? 30) * 1000;
  const events: SimEvent[] = [];
  const positions: SimPosition[] = [];
  const [y, m, d] = opts.date.split("-").map(Number);
  // medianoche local expresada en UTC
  const midnightUtc = Date.UTC(y, m - 1, d) - opts.utcOffsetHours * 3600_000;
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = domingo
  const dayFactor = weekday === 0 ? 0.5 : weekday === 6 ? 0.8 : 1;

  let t = midnightUtc + (5 * 60 + 30 + rng.int(0, 15)) * 60_000; // salida ~5:30 am
  const endOfService = midnightUtc + 21 * 3600_000;
  let outbound = true;
  const inRange = (time: number) => !opts.until || time <= opts.until.getTime();

  /** Punto de la ruta en la fracción f del viaje actual (con una curva suave). */
  const pointAt = (f: number): [number, number] => {
    const g = outbound ? f : 1 - f;
    const [fromLat, fromLng] = route.from;
    const [toLat, toLng] = route.to;
    return [
      fromLat + (toLat - fromLat) * g + Math.sin(Math.PI * g) * 0.004,
      fromLng + (toLng - fromLng) * g - Math.sin(Math.PI * g) * 0.003,
    ];
  };

  const push = (time: number, direction: "in" | "out", progress: number, isDriver = false) => {
    if (!inRange(time)) return;
    const [lat, lng] = pointAt(progress);
    events.push({
      id: rng.uuid(),
      occurred_at: new Date(time).toISOString(),
      direction,
      is_driver: isDriver,
      confidence: Math.round((0.8 + rng.next() * 0.19) * 100) / 100,
      lat: round6(lat + (rng.next() - 0.5) * 0.0004),
      lng: round6(lng + (rng.next() - 0.5) * 0.0004),
    });
  };

  const fix = (time: number, progress: number, speed: number, nextProgress = progress) => {
    if (!inRange(time)) return;
    const [lat, lng] = pointAt(progress);
    const [nLat, nLng] = pointAt(nextProgress);
    const heading = Math.round(((Math.atan2(nLng - lng, nLat - lat) * 180) / Math.PI + 360) % 360);
    positions.push({
      id: rng.uuid(),
      recorded_at: new Date(time).toISOString(),
      lat: round6(lat + (rng.next() - 0.5) * 0.0001),
      lng: round6(lng + (rng.next() - 0.5) * 0.0001),
      speed_kmh: Math.round(speed * 10) / 10,
      heading: heading % 360,
      accuracy_m: Math.round((3 + rng.next() * 5) * 10) / 10,
      satellites: rng.int(7, 13),
    });
  };

  while (t < endOfService) {
    // El conductor sube al inicio de algunos viajes (cruce que debe excluirse)
    if (rng.chance(0.25)) push(t - 60_000, "in", 0, true);

    let onboard = 0;
    for (let s = 0; s < STOPS_PER_TRIP; s++) {
      const progress = s / (STOPS_PER_TRIP - 1);
      const hour = new Date(t + opts.utcOffsetHours * 3600_000).getUTCHours();
      const isLast = s === STOPS_PER_TRIP - 1;

      fix(t, progress, 0); // detenido en la parada

      // Bajadas primero: una fracción de los que van a bordo (todos en la última parada)
      const alight = isLast ? onboard : Math.min(onboard, rng.poisson(onboard * 0.18));
      let cursor = t; // los pasajeros cruzan la puerta uno tras otro
      for (let i = 0; i < alight; i++) push((cursor += rng.int(1, 3) * 1000), "out", progress);
      onboard -= alight;

      // Subidas (no en la última parada), limitadas por la capacidad
      if (!isLast) {
        const lambda = 4.5 * demandFactor(hour) * dayFactor * (1 - progress * 0.6);
        const board = Math.min(capacity - onboard, rng.poisson(lambda));
        for (let i = 0; i < board; i++) push((cursor += rng.int(1, 3) * 1000), "in", progress);
        onboard += board;
      }

      const depart = cursor + 20_000;
      const arrive = Math.max(t + rng.int(2, 5) * 60_000, cursor + 60_000);
      if (!isLast) {
        // Recorrido entre esta parada y la siguiente
        const next = (s + 1) / (STOPS_PER_TRIP - 1);
        const speed = 18 + rng.next() * 22;
        for (let ts = depart; ts < arrive; ts += gpsStep) {
          const f = progress + ((next - progress) * (ts - depart)) / Math.max(1, arrive - depart);
          fix(ts, f, speed * (0.8 + rng.next() * 0.4), next);
        }
      }
      t = arrive;
    }

    if (rng.chance(0.25)) push(t + 30_000, "out", 1, true);
    outbound = !outbound;
    t += rng.int(5, 15) * 60_000; // descanso en terminal
  }

  return {
    events: events.sort((a, b) => a.occurred_at.localeCompare(b.occurred_at)),
    positions: positions.sort((a, b) => a.recorded_at.localeCompare(b.recorded_at)),
  };
}

/** Solo los eventos de conteo de un día simulado. */
export function simulateDay(rng: Rng, opts: DayOptions): SimEvent[] {
  return simulateDayFull(rng, opts).events;
}

function round6(n: number) {
  return Math.round(n * 1e6) / 1e6;
}
