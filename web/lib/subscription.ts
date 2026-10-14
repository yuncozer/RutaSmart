import type { BillingCycle, SubscriptionStatus } from "@/lib/types";

/**
 * Lógica de suscripciones (espejo de la función SQL get_subscription_status).
 * Se mantiene en TS para mostrar estados y para tests unitarios.
 */
export interface SubscriptionLike {
  status: SubscriptionStatus | string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  grace_days: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function computeSubscriptionStatus(
  sub: SubscriptionLike | null | undefined,
  now: Date = new Date(),
): SubscriptionStatus {
  if (!sub) return "none";
  if (sub.status === "canceled") return "canceled";
  const t = now.getTime();
  const trialEnd = sub.trial_ends_at ? new Date(sub.trial_ends_at).getTime() : null;
  if (trialEnd !== null && t < trialEnd) return "trialing";
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  const end = Math.max(periodEnd ?? -Infinity, trialEnd ?? -Infinity);
  if (!Number.isFinite(end)) return "expired";
  if (t < end) return "active";
  if (t < end + sub.grace_days * DAY_MS) return "grace";
  return "expired";
}

/** ¿El cliente puede ver el dashboard? (los conteos se reciben siempre). */
export function hasDashboardAccess(status: SubscriptionStatus) {
  return status === "trialing" || status === "active" || status === "grace";
}

export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trialing: "Prueba gratis",
  active: "Activa",
  grace: "Período de gracia",
  expired: "Vencida",
  canceled: "Cancelada",
  none: "Sin suscripción",
};

export const STATUS_VARIANT: Record<
  SubscriptionStatus,
  "success" | "warning" | "danger" | "default" | "muted"
> = {
  trialing: "default",
  active: "success",
  grace: "warning",
  expired: "danger",
  canceled: "danger",
  none: "muted",
};

/** Fecha de corte efectiva (fin de prueba o de período pagado, la mayor). */
export function effectiveEnd(sub: SubscriptionLike): Date | null {
  const a = sub.trial_ends_at ? new Date(sub.trial_ends_at).getTime() : null;
  const b = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  if (a === null && b === null) return null;
  return new Date(Math.max(a ?? -Infinity, b ?? -Infinity));
}

export function daysUntil(date: Date | null, now = new Date()) {
  if (!date) return null;
  return Math.ceil((date.getTime() - now.getTime()) / DAY_MS);
}

/** Suma meses a una fecha (UTC), ajustando fin de mes. */
export function addMonths(date: Date, months: number) {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

/** Nuevo fin de período al registrar un pago (desde la fecha mayor entre hoy y el corte actual). */
export function extendPeriod(sub: SubscriptionLike, periodMonths: number, now = new Date()) {
  const end = effectiveEnd(sub);
  const base = end && end.getTime() > now.getTime() ? end : now;
  return addMonths(base, periodMonths);
}

export interface PriceInput {
  monthlyPricePerBus: number;
  busQuantity: number;
  billingCycle: BillingCycle;
  fleetDiscountPct: number;
  annualFreeMonths: number;
}

export const FLEET_DISCOUNT_MIN_BUSES = 5;

/** Cálculo del precio (se muestra en el panel admin). */
export function calculatePrice(input: PriceInput) {
  const gross = input.monthlyPricePerBus * input.busQuantity;
  const discountPct = input.busQuantity >= FLEET_DISCOUNT_MIN_BUSES ? input.fleetDiscountPct : 0;
  const monthly = round2(gross * (1 - discountPct / 100));
  const annual = round2(monthly * (12 - input.annualFreeMonths));
  return {
    gross: round2(gross),
    discountPct,
    monthly,
    annual,
    perCycle: input.billingCycle === "annual" ? annual : monthly,
    periodMonths: input.billingCycle === "annual" ? 12 : 1,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
