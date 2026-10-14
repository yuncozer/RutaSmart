import { Download, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { FeatureLocked } from "@/components/app/subscription-gate";
import { requireAppContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatDate, formatNumber, todayIn } from "@/lib/format";
import { isValidIsoDate, normalizeDaily, perBusTotals } from "@/lib/dashboard";
import { hasFeature } from "@/lib/plans";
import type { Bus } from "@/lib/types";

export const metadata = { title: "Reportes" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; bus?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await requireAppContext();
  const today = todayIn(ctx.org.timezone);
  let to = isValidIsoDate(sp.hasta) && sp.hasta <= today ? sp.hasta : today;
  let from = isValidIsoDate(sp.desde) ? sp.desde : addDays(to, -6);
  let rangeWarning: string | null = null;
  if (from > to) [from, to] = [to, from];
  if (addDays(from, 366) < to) {
    from = addDays(to, -366);
    rangeWarning = "El rango máximo es de un año; se ajustó la fecha inicial.";
  }
  const busId = sp.bus || "";
  const country = ctx.org.country;

  const supabase = await createClient();
  const [{ data, error }, { data: buses }] = await Promise.all([
    supabase.rpc("daily_counts", {
      p_org_id: ctx.org.id,
      p_from: from,
      p_to: to,
      p_bus_id: busId || null,
    }),
    supabase.from("buses").select("*").eq("organization_id", ctx.org.id).order("plate"),
  ]);
  const rows = normalizeDaily(data);
  const busList = (buses ?? []) as Bus[];
  const busMap = new Map(busList.map((b) => [b.id, b]));
  const totals = perBusTotals(rows);
  const grand = [...totals.values()].reduce(
    (a, t) => ({ ins: a.ins + t.ins, outs: a.outs + t.outs, driver: a.driver + t.driver }),
    {
      ins: 0,
      outs: 0,
      driver: 0,
    },
  );
  const qs = new URLSearchParams({ from, to, ...(busId ? { bus: busId } : {}) }).toString();
  const canExport = hasFeature(ctx.access.features, "export");

  return (
    <>
      <PageHeader
        title="Reportes"
        description="Pasajeros por día y por bus. Los cruces del conductor no suman."
      />

      <Card className="mb-4">
        <CardContent className="pt-5">
          <form className="grid gap-3 sm:grid-cols-4 sm:items-end">
            <Field label="Desde" htmlFor="desde">
              <Input id="desde" name="desde" type="date" defaultValue={from} max={today} />
            </Field>
            <Field label="Hasta" htmlFor="hasta">
              <Input id="hasta" name="hasta" type="date" defaultValue={to} max={today} />
            </Field>
            <Field label="Bus" htmlFor="bus">
              <Select id="bus" name="bus" defaultValue={busId}>
                <option value="">Todos</option>
                {busList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.plate}
                    {b.alias ? ` · ${b.alias}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="submit">Consultar</Button>
          </form>
        </CardContent>
      </Card>

      {rangeWarning ? (
        <Alert variant="warning" className="mb-4">
          {rangeWarning}
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="danger" className="mb-4">
          No se pudo generar el reporte.
        </Alert>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {canExport ? (
          <>
            <a
              href={`/api/reports?format=xlsx&${qs}`}
              className={buttonVariants({ variant: "accent" })}
            >
              <FileSpreadsheet /> Descargar Excel
            </a>
            <a
              href={`/api/reports?format=csv&${qs}`}
              className={buttonVariants({ variant: "outline" })}
            >
              <Download /> Descargar CSV
            </a>
          </>
        ) : (
          <FeatureLocked feature="export" title="Exportar a Excel / CSV" />
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Sin datos en este rango"
          description="Prueba con otras fechas o con otro bus."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Resumen por bus</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <THead>
                  <tr>
                    <TH>Bus</TH>
                    <TH className="text-right">Subidas</TH>
                    <TH className="text-right">Bajadas</TH>
                    <TH className="text-right">Prom./día</TH>
                  </tr>
                </THead>
                <TBody>
                  {[...totals.entries()].map(([id, t]) => (
                    <tr key={id}>
                      <TD className="font-medium">{busMap.get(id)?.plate ?? "—"}</TD>
                      <TD className="text-right">{formatNumber(t.ins, country)}</TD>
                      <TD className="text-right">{formatNumber(t.outs, country)}</TD>
                      <TD className="text-right">
                        {formatNumber(Math.round(t.ins / Math.max(1, t.days)), country)}
                      </TD>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <TD>Total</TD>
                    <TD className="text-right">{formatNumber(grand.ins, country)}</TD>
                    <TD className="text-right">{formatNumber(grand.outs, country)}</TD>
                    <TD />
                  </tr>
                </TBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Por día</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[480px] overflow-y-auto">
              <Table>
                <THead>
                  <tr>
                    <TH>Fecha</TH>
                    <TH>Bus</TH>
                    <TH className="text-right">Subidas</TH>
                    <TH className="text-right">Bajadas</TH>
                    <TH className="text-right">Conductor</TH>
                  </tr>
                </THead>
                <TBody>
                  {[...rows].reverse().map((r) => (
                    <tr key={`${r.day}-${r.bus_id}`}>
                      <TD className="whitespace-nowrap">
                        {formatDate(`${r.day}T12:00:00Z`, { country })}
                      </TD>
                      <TD>{busMap.get(r.bus_id)?.plate ?? "—"}</TD>
                      <TD className="text-right">{formatNumber(r.ins, country)}</TD>
                      <TD className="text-right">{formatNumber(r.outs, country)}</TD>
                      <TD className="text-muted-foreground text-right">{r.driver_crossings}</TD>
                    </tr>
                  ))}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
