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

/**
 * Simula un día de operación de un bus: viajes ida/vuelta de ~50–70 min,
 * paradas cada 2–5 minutos, subidas según demanda horaria y bajadas coherentes
 * (nunca bajan más pasajeros de los que van a bordo; al final del viaje bajan todos).
 * Incluye algunos cruces del conductor (is_driver = true).
 */
export function simulateDay(rng: Rng, opts: DayOptions): SimEvent[] {
  const route = opts.route ?? DEFAULT_ROUTE!;
  const capacity = opts.capacity ?? 40;
  const events: SimEvent[] = [];
  const [y, m, d] = opts.date.split("-").map(Number);
  // medianoche local expresada en UTC
  const midnightUtc = Date.UTC(y, m - 1, d) - opts.utcOffsetHours * 3600_000;
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = domingo
  const dayFactor = weekday === 0 ? 0.5 : weekday === 6 ? 0.8 : 1;

  let t = midnightUtc + (5 * 60 + 30 + rng.int(0, 15)) * 60_000; // salida ~5:30 am
  const endOfService = midnightUtc + 21 * 3600_000;
  let outbound = true;

  const push = (time: number, direction: "in" | "out", progress: number, isDriver = false) => {
    if (opts.until && time > opts.until.getTime()) return;
    const [fromLat, fromLng] = outbound ? route.from : route.to;
    const [toLat, toLng] = outbound ? route.to : route.from;
    events.push({
      id: rng.uuid(),
      occurred_at: new Date(time).toISOString(),
      direction,
      is_driver: isDriver,
      confidence: Math.round((0.8 + rng.next() * 0.19) * 100) / 100,
      lat: round6(fromLat + (toLat - fromLat) * progress + (rng.next() - 0.5) * 0.001),
      lng: round6(fromLng + (toLng - fromLng) * progress + (rng.next() - 0.5) * 0.001),
    });
  };

  while (t < endOfService) {
    // El conductor sube al inicio de algunos viajes (cruce que debe excluirse)
    if (rng.chance(0.25)) push(t - 60_000, "in", 0, true);

    const stops = rng.int(12, 20);
    let onboard = 0;
    for (let s = 0; s < stops; s++) {
      const progress = s / (stops - 1);
      const hour = new Date(t + opts.utcOffsetHours * 3600_000).getUTCHours();
      const isLast = s === stops - 1;

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
      t = Math.max(t + rng.int(2, 5) * 60_000, cursor + 60_000);
    }

    if (rng.chance(0.25)) push(t + 30_000, "out", 1, true);
    outbound = !outbound;
    t += rng.int(5, 15) * 60_000; // descanso en terminal
  }

  return events.sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
}

function round6(n: number) {
  return Math.round(n * 1e6) / 1e6;
}
