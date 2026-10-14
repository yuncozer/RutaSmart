import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BatteryMedium,
  Bus,
  ChevronRight,
  UserX,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/empty-state";
import { ActionButton } from "@/components/action-form";
import { CountsChart } from "@/components/charts/counts-chart";
import { OnlineDot } from "@/components/status-badges";
import { FeatureLocked } from "@/components/app/subscription-gate";
import { requireAppContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatDate, formatNumber, localeFor, timeAgo, todayIn } from "@/lib/format";
import {
  dailySeries,
  homeSummary,
  normalizeDaily,
  shortDayLabel,
  totalsFor,
} from "@/lib/dashboard";
import { hasFeature } from "@/lib/plans";
import type { Bus as BusRow, Device } from "@/lib/types";
import { markAlertRead } from "./actions";

export const metadata = { title: "Inicio" };

export default async function ClientHomePage() {
  const ctx = await requireAppContext();
  const supabase = await createClient();
  const today = todayIn(ctx.org.timezone);
  const from = addDays(today, -7);
  const f = ctx.access.features;
  const country = ctx.org.country;

  const [{ data: daily, error }, { data: buses }, { data: devices }, { data: alerts }] =
    await Promise.all([
      supabase.rpc("daily_counts", { p_org_id: ctx.org.id, p_from: from, p_to: today }),
      supabase
        .from("buses")
        .select("*")
        .eq("organization_id", ctx.org.id)
        .eq("is_active", true)
        .order("plate"),
      supabase
        .from("devices")
        .select("id, serial, bus_id, status, last_seen_at, last_battery, last_rssi")
        .eq("organization_id", ctx.org.id),
      hasFeature(f, "alerts")
        ? supabase
            .from("alerts")
            .select("id, message, type, created_at")
            .eq("organization_id", ctx.org.id)
            .eq("is_read", false)
            .order("created_at", { ascending: false })
            .limit(5)
        : Promise.resolve({
            data: [] as { id: string; message: string; type: string; created_at: string }[],
          }),
    ]);

  const rows = normalizeDaily(daily);
  const summary = homeSummary(rows, today);
  const busList = (buses ?? []) as BusRow[];
  const deviceByBus = new Map(((devices ?? []) as Device[]).map((d) => [d.bus_id, d]));
  const week = dailySeries(rows, addDays(today, -6), today).map((d) => ({
    label: shortDayLabel(d.day, localeFor(country)),
    ins: d.ins,
    outs: d.outs,
  }));
  const comparisons = hasFeature(f, "comparisons");
  const online = busList.filter((b) => {
    const d = deviceByBus.get(b.id);
    return d && d.last_seen_at && Date.now() - new Date(d.last_seen_at).getTime() < 3600_000;
  }).length;

  return (
    <>
      <PageHeader
        title={
          ctx.role === "driver"
            ? `Hola, ${ctx.profile.full_name?.split(" ")[0] ?? ""}`
            : "Pasajeros de hoy"
        }
        description={`${ctx.org.name} · ${formatDate(new Date(), { country, timezone: ctx.org.timezone })}`}
      />

      {error ? (
        <Alert variant="danger" className="mb-4">
          No se pudieron cargar los conteos. Intenta de nuevo.
        </Alert>
      ) : null}

      {alerts && alerts.length > 0 && ctx.role === "owner" ? (
        <Card className="border-accent/40 mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bell className="text-accent size-4" /> Alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((a) => (
              <div
                key={a.id}
                className="bg-muted/60 flex items-start justify-between gap-3 rounded-lg p-3 text-sm"
              >
                <div>
                  <p>{a.message}</p>
                  <p className="text-muted-foreground text-xs">{timeAgo(a.created_at)}</p>
                </div>
                <ActionButton action={markAlertRead} fields={{ id: a.id }} variant="ghost">
                  Listo
                </ActionButton>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Subidas hoy"
          value={formatNumber(summary.today.ins, country)}
          icon={ArrowUpRight}
          change={comparisons ? summary.vsYesterday : undefined}
          hint={comparisons ? "vs. ayer" : undefined}
        />
        <StatCard
          label="Bajadas hoy"
          value={formatNumber(summary.today.outs, country)}
          icon={ArrowDownRight}
        />
        <StatCard
          label="Mismo día semana pasada"
          value={comparisons ? formatNumber(summary.lastWeek.ins, country) : "—"}
          icon={Users}
          change={comparisons ? summary.vsLastWeek : undefined}
          hint={comparisons ? "hoy vs. ese día" : "Disponible en plan Pro"}
        />
        <StatCard
          label="Equipos en línea"
          value={`${online} / ${busList.length}`}
          icon={Bus}
          hint={
            hasFeature(f, "driver_exclusion")
              ? `${summary.today.driver} cruces del conductor hoy (excluidos)`
              : undefined
          }
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Subidas y bajadas · últimos 7 días</CardTitle>
          </CardHeader>
          <CardContent>
            <CountsChart data={week} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{ctx.role === "driver" ? "Mi bus" : "Buses"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {busList.length === 0 ? (
              <EmptyState
                icon={Bus}
                title="Sin buses"
                description="Aún no hay buses registrados o asignados."
              />
            ) : (
              busList.map((b) => {
                const t = totalsFor(rows, today, b.id);
                const d = deviceByBus.get(b.id);
                return (
                  <Link
                    key={b.id}
                    href={`/app/buses/${b.id}`}
                    className="hover:bg-muted flex items-center gap-3 rounded-xl border p-3 transition-colors"
                  >
                    <div className="bg-navy-100 text-navy-900 dark:bg-navy-800 dark:text-navy-100 grid size-10 shrink-0 place-items-center rounded-lg">
                      <Bus className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {b.plate}{" "}
                        <span className="text-muted-foreground text-sm font-normal">{b.alias}</span>
                      </p>
                      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 text-xs">
                        {d ? <OnlineDot lastSeen={d.last_seen_at} /> : <span>Sin equipo</span>}
                        {d && hasFeature(f, "device_status") ? (
                          <span className="inline-flex items-center gap-1">
                            <BatteryMedium className="size-3" /> {d.last_battery ?? "—"}%
                          </span>
                        ) : null}
                        {b.route_name ? <span className="truncate">{b.route_name}</span> : null}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{formatNumber(t.ins, country)}</p>
                      <p className="text-muted-foreground text-xs">subidas</p>
                    </div>
                    <ChevronRight className="text-muted-foreground size-4" />
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {!hasFeature(f, "driver_exclusion") ? (
        <div className="mt-4">
          <FeatureLocked feature="driver_exclusion" title="Auditoría de cruces del conductor" />
        </div>
      ) : summary.today.driver > 0 ? (
        <p className="text-muted-foreground mt-4 flex items-center gap-2 text-xs">
          <UserX className="size-4" /> Los cruces del conductor ({summary.today.driver} hoy) no se
          suman a los pasajeros.
        </p>
      ) : null}
    </>
  );
}
