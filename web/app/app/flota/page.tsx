import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { FeatureLocked } from "@/components/app/subscription-gate";
import { OnlineDot } from "@/components/status-badges";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatNumber, percentChange, todayIn } from "@/lib/format";
import { normalizeDaily, totalsFor } from "@/lib/dashboard";
import { hasFeature } from "@/lib/plans";
import type { Bus, Device } from "@/lib/types";

export const metadata = { title: "Flota" };

export default async function FleetPage() {
  const ctx = await requireOwner();
  if (!hasFeature(ctx.access.features, "fleet_view")) {
    return (
      <>
        <PageHeader title="Flota" description="Comparativa de todos tus buses." />
        <FeatureLocked feature="fleet_view" title="Vista multi-bus de la flota" />
      </>
    );
  }

  const today = todayIn(ctx.org.timezone);
  const from = addDays(today, -13);
  const supabase = await createClient();
  const [{ data }, { data: buses }, { data: devices }] = await Promise.all([
    supabase.rpc("daily_counts", { p_org_id: ctx.org.id, p_from: from, p_to: today }),
    supabase
      .from("buses")
      .select("*")
      .eq("organization_id", ctx.org.id)
      .eq("is_active", true)
      .order("plate"),
    supabase
      .from("devices")
      .select("bus_id, last_seen_at, last_battery")
      .eq("organization_id", ctx.org.id),
  ]);
  const rows = normalizeDaily(data);
  const deviceByBus = new Map(((devices ?? []) as Device[]).map((d) => [d.bus_id, d]));
  const country = ctx.org.country;
  const lastWeekStart = addDays(today, -6);
  const prevWeekStart = addDays(today, -13);

  const table = ((buses ?? []) as Bus[])
    .map((b) => {
      const range = (a: string, z: string) =>
        rows
          .filter((r) => r.bus_id === b.id && r.day >= a && r.day <= z)
          .reduce((acc, r) => acc + r.ins, 0);
      const week = range(lastWeekStart, today);
      const prev = range(prevWeekStart, addDays(lastWeekStart, -1));
      const driver = rows
        .filter((r) => r.bus_id === b.id && r.day >= lastWeekStart)
        .reduce((a, r) => a + r.driver_crossings, 0);
      return {
        bus: b,
        today: totalsFor(rows, today, b.id).ins,
        week,
        avg: Math.round(week / 7),
        change: percentChange(week, prev),
        driver,
      };
    })
    .sort((a, b) => b.week - a.week);
  const max = Math.max(1, ...table.map((r) => r.week));

  return (
    <>
      <PageHeader title="Flota" description="Últimos 7 días comparados con los 7 anteriores." />
      <Card>
        <CardHeader>
          <CardTitle>{table.length} buses activos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <tr>
                <TH>Bus</TH>
                <TH className="text-right">Hoy</TH>
                <TH>7 días</TH>
                <TH className="text-right">Prom./día</TH>
                <TH className="text-right">Variación</TH>
                <TH className="text-right">Cruces conductor</TH>
                <TH>Equipo</TH>
              </tr>
            </THead>
            <TBody>
              {table.map((r) => {
                const d = deviceByBus.get(r.bus.id);
                return (
                  <tr key={r.bus.id}>
                    <TD>
                      <Link
                        href={`/app/buses/${r.bus.id}`}
                        className="text-link font-medium hover:underline"
                      >
                        {r.bus.plate}
                      </Link>
                      <span className="text-muted-foreground block text-xs">
                        {r.bus.route_name}
                      </span>
                    </TD>
                    <TD className="text-right">{formatNumber(r.today, country)}</TD>
                    <TD className="min-w-40">
                      <div className="flex items-center gap-2">
                        <div className="bg-muted h-2 flex-1 rounded-full">
                          <div
                            className="h-2 rounded-full bg-[var(--chart-in)]"
                            style={{ width: `${(r.week / max) * 100}%` }}
                          />
                        </div>
                        <span className="w-14 text-right tabular-nums">
                          {formatNumber(r.week, country)}
                        </span>
                      </div>
                    </TD>
                    <TD className="text-right">{formatNumber(r.avg, country)}</TD>
                    <TD
                      className={`text-right ${r.change === null ? "text-muted-foreground" : r.change >= 0 ? "text-success" : "text-danger"}`}
                    >
                      {r.change === null ? "—" : `${r.change > 0 ? "+" : ""}${r.change}%`}
                    </TD>
                    <TD className="text-muted-foreground text-right">{r.driver}</TD>
                    <TD>
                      {d ? (
                        <span className="flex flex-col">
                          <OnlineDot lastSeen={d.last_seen_at} />
                          <span className="text-muted-foreground text-xs">
                            Batería {d.last_battery ?? "—"}%
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">Sin equipo</span>
                      )}
                    </TD>
                  </tr>
                );
              })}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
