import type { DailyCountRow } from "@/lib/types";

export interface ReportRow {
  fecha: string;
  placa: string;
  alias: string;
  ruta: string;
  subidas: number;
  bajadas: number;
  cruces_conductor: number;
}

export const REPORT_HEADERS: { key: keyof ReportRow; label: string }[] = [
  { key: "fecha", label: "Fecha" },
  { key: "placa", label: "Placa" },
  { key: "alias", label: "Alias" },
  { key: "ruta", label: "Ruta" },
  { key: "subidas", label: "Subidas" },
  { key: "bajadas", label: "Bajadas" },
  { key: "cruces_conductor", label: "Cruces del conductor (excluidos)" },
];

export function buildReportRows(
  rows: DailyCountRow[],
  buses: Map<string, { plate: string; alias: string | null; route_name: string | null }>,
): ReportRow[] {
  return rows
    .map((r) => {
      const b = buses.get(r.bus_id);
      return {
        fecha: r.day,
        placa: b?.plate ?? "",
        alias: b?.alias ?? "",
        ruta: b?.route_name ?? "",
        subidas: r.ins,
        bajadas: r.outs,
        cruces_conductor: r.driver_crossings,
      };
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.placa.localeCompare(b.placa));
}

function csvCell(v: string | number) {
  const s = String(v);
  // Evita inyección de fórmulas al abrir en Excel
  const safe = /^[=+\-@\t\r]/.test(s) && typeof v === "string" ? `'${s}` : s;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** CSV con BOM y separador ";" (Excel en español lo abre directo). */
export function toCsv(rows: ReportRow[]) {
  const lines = [REPORT_HEADERS.map((h) => csvCell(h.label)).join(";")];
  for (const r of rows) lines.push(REPORT_HEADERS.map((h) => csvCell(r[h.key])).join(";"));
  return "﻿" + lines.join("\r\n") + "\r\n";
}
