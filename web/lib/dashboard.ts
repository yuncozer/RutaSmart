import type { DailyCountRow } from "@/lib/types";
import { addDays, percentChange } from "@/lib/format";

/** Normaliza filas de la RPC (bigint llega como string o number). */
export function normalizeDaily(rows: unknown[] | null | undefined): DailyCountRow[] {
  return (rows ?? []).map((r) => {
    const x = r as Record<string, unknown>;
    return {
      bus_id: String(x.bus_id),
      day: String(x.day),
      ins: Number(x.ins ?? 0),
      outs: Number(x.outs ?? 0),
      driver_crossings: Number(x.driver_crossings ?? 0),
    };
  });
}

export interface DayTotals {
  ins: number;
  outs: number;
  driver: number;
}

export function totalsFor(rows: DailyCountRow[], day: string, busId?: string): DayTotals {
  return rows
    .filter((r) => r.day === day && (!busId || r.bus_id === busId))
    .reduce(
      (acc, r) => ({
        ins: acc.ins + r.ins,
        outs: acc.outs + r.outs,
        driver: acc.driver + r.driver_crossings,
      }),
      {
        ins: 0,
        outs: 0,
        driver: 0,
      },
    );
}

/** Resumen de "Inicio": hoy vs ayer vs mismo día de la semana pasada. */
export function homeSummary(rows: DailyCountRow[], today: string) {
  const t = totalsFor(rows, today);
  const yesterday = totalsFor(rows, addDays(today, -1));
  const lastWeek = totalsFor(rows, addDays(today, -7));
  return {
    today: t,
    yesterday,
    lastWeek,
    vsYesterday: percentChange(t.ins, yesterday.ins),
    vsLastWeek: percentChange(t.ins, lastWeek.ins),
  };
}

/** Serie diaria continua (rellena días sin datos con 0). */
export function dailySeries(rows: DailyCountRow[], from: string, to: string, busId?: string) {
  const out: { day: string; ins: number; outs: number; driver: number }[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const t = totalsFor(rows, d, busId);
    out.push({ day: d, ins: t.ins, outs: t.outs, driver: t.driver });
  }
  return out;
}

/** Agregado por bus en un rango (para Flota y Reportes). */
export function perBusTotals(rows: DailyCountRow[]) {
  const map = new Map<string, DayTotals & { days: number }>();
  for (const r of rows) {
    const cur = map.get(r.bus_id) ?? { ins: 0, outs: 0, driver: 0, days: 0 };
    cur.ins += r.ins;
    cur.outs += r.outs;
    cur.driver += r.driver_crossings;
    cur.days += 1;
    map.set(r.bus_id, cur);
  }
  return map;
}

/** Etiqueta corta de día ("lun 13") en español. */
export function shortDayLabel(isoDate: string, locale = "es-VE") {
  const d = new Date(`${isoDate}T12:00:00Z`);
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/** ¿Es un error de suscripción vencida devuelto por las funciones SQL? */
export function isSubscriptionError(error: { message?: string } | null | undefined) {
  return Boolean(error?.message?.includes("subscription_expired"));
}

export function isValidIsoDate(s: string | undefined | null): s is string {
  return Boolean(
    s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T12:00:00Z`).getTime()),
  );
}
