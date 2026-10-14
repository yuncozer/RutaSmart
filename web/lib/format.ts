import type { Country } from "@/lib/types";

/** Locale de la interfaz según el país de la organización. */
export function localeFor(country?: Country | null) {
  return country === "CO" ? "es-CO" : "es-VE";
}

export function formatNumber(value: number, country?: Country | null) {
  return new Intl.NumberFormat(localeFor(country)).format(value);
}

export function formatUsd(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

export function formatDate(
  value: string | Date | null | undefined,
  opts: { country?: Country | null; timezone?: string; withTime?: boolean } = {},
) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(localeFor(opts.country), {
    timeZone: opts.timezone,
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(opts.withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d);
}

/** Tiempo relativo en español ("hace 5 min"). */
export function timeAgo(value: string | null | undefined, now = new Date()) {
  if (!value) return "nunca";
  const diff = Math.max(0, now.getTime() - new Date(value).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return "hace instantes";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} ${d === 1 ? "día" : "días"}`;
}

/** Fecha (YYYY-MM-DD) de "hoy" en una zona horaria. */
export function todayIn(timezone: string, base = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(base);
}

/** Suma días a una fecha YYYY-MM-DD (sin problemas de zona horaria). */
export function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
