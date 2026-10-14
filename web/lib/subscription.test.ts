import { describe, expect, it } from "vitest";
import { addMonths, calculatePrice, computeSubscriptionStatus, extendPeriod } from "./subscription";

const now = new Date("2026-10-14T12:00:00Z");
const base = { status: "active", trial_ends_at: null, current_period_end: null, grace_days: 7 };

describe("computeSubscriptionStatus", () => {
  it("sin suscripción → none", () => {
    expect(computeSubscriptionStatus(null, now)).toBe("none");
  });
  it("dentro de la prueba gratis → trialing", () => {
    expect(computeSubscriptionStatus({ ...base, trial_ends_at: "2026-12-01T00:00:00Z" }, now)).toBe(
      "trialing",
    );
  });
  it("período pagado vigente → active", () => {
    expect(
      computeSubscriptionStatus({ ...base, current_period_end: "2026-10-20T00:00:00Z" }, now),
    ).toBe("active");
  });
  it("vencida hace ≤ 7 días → grace", () => {
    expect(
      computeSubscriptionStatus({ ...base, current_period_end: "2026-10-10T00:00:00Z" }, now),
    ).toBe("grace");
  });
  it("vencida hace > 7 días → expired", () => {
    expect(
      computeSubscriptionStatus({ ...base, current_period_end: "2026-10-01T00:00:00Z" }, now),
    ).toBe("expired");
  });
  it("respeta grace_days configurable", () => {
    expect(
      computeSubscriptionStatus(
        { ...base, grace_days: 20, current_period_end: "2026-10-01T00:00:00Z" },
        now,
      ),
    ).toBe("grace");
  });
  it("cancelada siempre es canceled", () => {
    expect(
      computeSubscriptionStatus(
        { ...base, status: "canceled", current_period_end: "2027-01-01T00:00:00Z" },
        now,
      ),
    ).toBe("canceled");
  });
  it("prueba terminada sin pagos entra en gracia", () => {
    expect(computeSubscriptionStatus({ ...base, trial_ends_at: "2026-10-12T00:00:00Z" }, now)).toBe(
      "grace",
    );
  });
});

describe("extendPeriod", () => {
  it("si está vencida, extiende desde hoy", () => {
    const end = extendPeriod({ ...base, current_period_end: "2026-09-01T00:00:00Z" }, 1, now);
    expect(end.toISOString()).toBe("2026-11-14T12:00:00.000Z");
  });
  it("si está vigente, extiende desde el corte actual", () => {
    const end = extendPeriod({ ...base, current_period_end: "2026-10-30T00:00:00Z" }, 12, now);
    expect(end.toISOString()).toBe("2027-10-30T00:00:00.000Z");
  });
  it("addMonths ajusta fin de mes", () => {
    expect(addMonths(new Date("2026-01-31T00:00:00Z"), 1).toISOString()).toBe(
      "2026-02-28T00:00:00.000Z",
    );
  });
});

describe("calculatePrice", () => {
  it("sin descuento con menos de 5 buses", () => {
    const p = calculatePrice({
      monthlyPricePerBus: 25,
      busQuantity: 4,
      billingCycle: "monthly",
      fleetDiscountPct: 10,
      annualFreeMonths: 2,
    });
    expect(p).toMatchObject({
      gross: 100,
      discountPct: 0,
      monthly: 100,
      annual: 1000,
      perCycle: 100,
      periodMonths: 1,
    });
  });
  it("descuento por flota y pago anual (2 meses gratis)", () => {
    const p = calculatePrice({
      monthlyPricePerBus: 25,
      busQuantity: 10,
      billingCycle: "annual",
      fleetDiscountPct: 10,
      annualFreeMonths: 2,
    });
    expect(p).toMatchObject({
      gross: 250,
      discountPct: 10,
      monthly: 225,
      annual: 2250,
      perCycle: 2250,
      periodMonths: 12,
    });
  });
});
