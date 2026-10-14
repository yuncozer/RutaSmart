import { describe, expect, it } from "vitest";
import { dailySeries, homeSummary, normalizeDaily, perBusTotals } from "./dashboard";

const rows = normalizeDaily([
  { bus_id: "a", day: "2026-10-14", ins: "120", outs: "110", driver_crossings: "3" },
  { bus_id: "b", day: "2026-10-14", ins: 80, outs: 79, driver_crossings: 1 },
  { bus_id: "a", day: "2026-10-13", ins: 100, outs: 95, driver_crossings: 2 },
  { bus_id: "a", day: "2026-10-07", ins: 250, outs: 240, driver_crossings: 0 },
]);

describe("homeSummary", () => {
  it("compara hoy con ayer y con la semana pasada", () => {
    const s = homeSummary(rows, "2026-10-14");
    expect(s.today).toEqual({ ins: 200, outs: 189, driver: 4 });
    expect(s.vsYesterday).toBe(100);
    expect(s.vsLastWeek).toBe(-20);
  });
  it("sin datos previos devuelve null", () => {
    expect(homeSummary(rows, "2026-10-20").vsYesterday).toBeNull();
  });
});

describe("dailySeries", () => {
  it("rellena días vacíos", () => {
    const s = dailySeries(rows, "2026-10-12", "2026-10-14", "a");
    expect(s.map((d) => d.ins)).toEqual([0, 100, 120]);
  });
});

describe("perBusTotals", () => {
  it("agrega por bus", () => {
    expect(perBusTotals(rows).get("a")).toEqual({ ins: 470, outs: 445, driver: 5, days: 3 });
  });
});
