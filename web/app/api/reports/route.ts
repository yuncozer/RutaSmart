import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { getAppContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hasFeature } from "@/lib/plans";
import { hasDashboardAccess } from "@/lib/subscription";
import { isValidIsoDate, normalizeDaily } from "@/lib/dashboard";
import { buildReportRows, REPORT_HEADERS, toCsv } from "@/lib/reports";

export const dynamic = "force-dynamic";

/** GET /api/reports?format=csv|xlsx&from=YYYY-MM-DD&to=YYYY-MM-DD&bus=<uuid> */
export async function GET(req: NextRequest) {
  const ctx = await getAppContext();
  if (!ctx) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!hasDashboardAccess(ctx.access.status)) {
    return NextResponse.json({ error: "Suscripción vencida" }, { status: 402 });
  }
  if (!hasFeature(ctx.access.features, "export")) {
    return NextResponse.json({ error: "Tu plan no incluye exportación" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const format = sp.get("format") === "xlsx" ? "xlsx" : "csv";
  const from = sp.get("from");
  const to = sp.get("to");
  const bus = sp.get("bus") || null;
  if (!isValidIsoDate(from) || !isValidIsoDate(to) || from > to) {
    return NextResponse.json({ error: "Rango de fechas inválido" }, { status: 400 });
  }

  const supabase = await createClient();
  const [{ data, error }, { data: buses }] = await Promise.all([
    supabase.rpc("daily_counts", { p_org_id: ctx.org.id, p_from: from, p_to: to, p_bus_id: bus }),
    supabase.from("buses").select("id, plate, alias, route_name").eq("organization_id", ctx.org.id),
  ]);
  if (error) return NextResponse.json({ error: "No se pudo generar el reporte" }, { status: 400 });

  const rows = buildReportRows(normalizeDaily(data), new Map((buses ?? []).map((b) => [b.id, b])));
  const filename = `rutasmart_${from}_${to}`;

  if (format === "csv") {
    return new NextResponse(toCsv(rows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "RutaSmart";
  const ws = wb.addWorksheet("Pasajeros");
  ws.columns = REPORT_HEADERS.map((h) => ({
    header: h.label,
    key: h.key,
    width: h.key === "ruta" ? 28 : 16,
  }));
  rows.forEach((r) => ws.addRow({ ...r, fecha: new Date(`${r.fecha}T12:00:00Z`) }));
  ws.getColumn("fecha").numFmt = "dd/mm/yyyy";
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B1F3A" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  const total = ws.addRow({
    fecha: "Total",
    subidas: rows.reduce((a, r) => a + r.subidas, 0),
    bajadas: rows.reduce((a, r) => a + r.bajadas, 0),
    cruces_conductor: rows.reduce((a, r) => a + r.cruces_conductor, 0),
  });
  total.font = { bold: true };

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${filename}.xlsx"`,
    },
  });
}
