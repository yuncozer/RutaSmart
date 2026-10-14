import { describe, expect, it } from "vitest";
import { createRng } from "./rng.js";
import { simulateDay } from "./trips.js";

describe("simulateDay", () => {
  const events = simulateDay(createRng(1), { date: "2026-10-13", utcOffsetHours: -4 });
  const passengers = events.filter((e) => !e.is_driver);

  it("genera eventos con UUID únicos", () => {
    expect(events.length).toBeGreaterThan(100);
    expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
  });

  it("nunca hay más bajadas que pasajeros a bordo", () => {
    let onboard = 0;
    for (const e of passengers) {
      onboard += e.direction === "in" ? 1 : -1;
      expect(onboard).toBeGreaterThanOrEqual(0);
    }
    expect(onboard).toBe(0); // al final del día no queda nadie a bordo
  });

  it("concentra más subidas en la hora pico de la mañana que a media tarde", () => {
    const hourOf = (iso: string) => (new Date(iso).getUTCHours() - 4 + 24) % 24;
    const ins = passengers.filter((e) => e.direction === "in");
    const peak = ins.filter((e) => hourOf(e.occurred_at) === 7).length;
    const valley = ins.filter((e) => hourOf(e.occurred_at) === 15).length;
    expect(peak).toBeGreaterThan(valley);
  });

  it("incluye cruces del conductor", () => {
    expect(events.some((e) => e.is_driver)).toBe(true);
  });

  it("respeta el límite 'until'", () => {
    const until = new Date("2026-10-13T14:00:00Z");
    const partial = simulateDay(createRng(1), { date: "2026-10-13", utcOffsetHours: -4, until });
    expect(partial.every((e) => new Date(e.occurred_at) <= until)).toBe(true);
  });
});
