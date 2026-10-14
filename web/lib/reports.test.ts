import { describe, expect, it } from "vitest";
import { buildReportRows, toCsv } from "./reports";

const buses = new Map([
  ["b1", { plate: "ABC-123", alias: "=HACK()", route_name: "Centro; Terminal" }],
]);

describe("reportes", () => {
  it("genera CSV con BOM, separador ; y escapes", () => {
    const rows = buildReportRows(
      [{ bus_id: "b1", day: "2026-10-14", ins: 10, outs: 9, driver_crossings: 1 }],
      buses,
    );
    const csv = toCsv(rows);
    expect(csv.startsWith("﻿Fecha;Placa")).toBe(true);
    expect(csv).toContain('2026-10-14;ABC-123;\'=HACK();"Centro; Terminal";10;9;1');
  });
});
