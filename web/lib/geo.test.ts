import { describe, expect, it } from "vitest";
import { averageMovingSpeed, boundsOf, busGpsState, haversineKm, routeDistanceKm } from "./geo";

describe("geo", () => {
  it("haversine: ~1,11 km por cada 0,01° de latitud", () => {
    expect(haversineKm({ lat: 7.76, lng: -72.22 }, { lat: 7.77, lng: -72.22 })).toBeCloseTo(
      1.112,
      2,
    );
  });

  it("distancia de un recorrido ignora saltos imposibles del GPS", () => {
    const pts = [
      { lat: 7.76, lng: -72.22 },
      { lat: 7.77, lng: -72.22 },
      { lat: 9.5, lng: -70.0 }, // salto de ~300 km (error)
      { lat: 7.78, lng: -72.22 },
    ];
    // tramo válido 1 (1,11 km); los dos saltos se ignoran
    expect(routeDistanceKm(pts)).toBe(1.1);
  });

  it("velocidad promedio solo en movimiento", () => {
    expect(averageMovingSpeed([0, 0, 20, 30, null, 1])).toBe(25);
    expect(averageMovingSpeed([0, 0])).toBeNull();
  });

  it("estado del bus según la última posición", () => {
    const now = Date.parse("2026-10-16T12:00:00Z");
    expect(busGpsState({ lat: null, position_at: null, speed_kmh: null }, now)).toBe("no_gps");
    expect(busGpsState({ lat: 7.7, position_at: "2026-10-16T11:30:00Z", speed_kmh: 30 }, now)).toBe(
      "stale",
    );
    expect(busGpsState({ lat: 7.7, position_at: "2026-10-16T11:58:00Z", speed_kmh: 30 }, now)).toBe(
      "moving",
    );
    expect(busGpsState({ lat: 7.7, position_at: "2026-10-16T11:58:00Z", speed_kmh: 0 }, now)).toBe(
      "stopped",
    );
  });

  it("límites del mapa", () => {
    expect(boundsOf([])).toBeNull();
    expect(
      boundsOf([
        { lat: 1, lng: 2 },
        { lat: -1, lng: 5 },
      ]),
    ).toEqual([
      [-1, 2],
      [1, 5],
    ]);
  });
});
