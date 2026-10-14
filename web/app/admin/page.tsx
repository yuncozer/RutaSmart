import Link from "next/link";
import { Activity, Building2, Bus, Cpu, DollarSign, WifiOff } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { SubscriptionBadge } from "@/components/status-badges";
import { createClient } from "@/lib/supabase/server";
import { formatNumber, formatUsd, timeAgo } from "@/lib/format";
import type { SubscriptionStatus } from "@/lib/types";

export const metadata = { title: "Resumen" };

interface Overview {
  organizations: number;
  buses: number;
  devices_active: number;
  devices_online: number;
  devices_offline: number;
  devices_inventory: number;
  subscriptions_by_status: Partial<Record<SubscriptionStatus, number>>;
  estimated_mrr_usd: number;
  events_today: number;
}

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const [{ data }, { data: offline }] = await Promise.all([
    supabase.rpc("admin_overview"),
    supabase
      .from("devices")
      .select("id, serial, last_seen_at, organization:organizations(name), bus:buses(plate)")
      .eq("status", "active")
      .or(`last_seen_at.is.null,last_seen_at.lt.${new Date(Date.now() - 3600_000).toISOString()}`)
      .order("last_seen_at", { ascending: true, nullsFirst: true })
      .limit(10),
  ]);
  const o = (data ?? {}) as Overview;
  const statuses: SubscriptionStatus[] = ["trialing", "active", "grace", "expired", "canceled"];

  return (
    <>
      <PageHeader title="Resumen" description="Estado general de RutaSmart." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Organizaciones"
          value={formatNumber(o.organizations ?? 0)}
          icon={Building2}
        />
        <StatCard label="Buses activos" value={formatNumber(o.buses ?? 0)} icon={Bus} />
        <StatCard
          label="Equipos en línea"
          value={`${o.devices_online ?? 0} / ${o.devices_active ?? 0}`}
          icon={Cpu}
          hint={`${o.devices_inventory ?? 0} en inventario`}
        />
        <StatCard
          label="Ingreso mensual estimado"
          value={formatUsd(o.estimated_mrr_usd)}
          icon={DollarSign}
          hint="Suscripciones activas y en gracia"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Suscripciones por estado</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {statuses.map((s) => (
              <Link
                key={s}
                href={`/admin/suscripciones?estado=${s}`}
                className="hover:bg-muted rounded-xl border p-3 transition-colors"
              >
                <SubscriptionBadge status={s} />
                <p className="mt-2 text-2xl font-bold">{o.subscriptions_by_status?.[s] ?? 0}</p>
              </Link>
            ))}
            <div className="rounded-xl border p-3">
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <Activity className="size-3" /> Eventos 24 h
              </span>
              <p className="mt-2 text-2xl font-bold">{formatNumber(o.events_today ?? 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WifiOff className="text-danger size-4" /> Equipos sin conexión (
              {o.devices_offline ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {offline?.length ? (
              <Table>
                <THead>
                  <tr>
                    <TH>Serial</TH>
                    <TH>Cliente</TH>
                    <TH>Última conexión</TH>
                  </tr>
                </THead>
                <TBody>
                  {offline.map((d) => {
                    const row = d as unknown as {
                      id: string;
                      serial: string;
                      last_seen_at: string | null;
                      organization: { name: string } | null;
                      bus: { plate: string } | null;
                    };
                    return (
                      <tr key={row.id}>
                        <TD className="font-mono">{row.serial}</TD>
                        <TD>
                          {row.organization?.name ?? "—"}
                          <span className="text-muted-foreground block text-xs">
                            {row.bus?.plate}
                          </span>
                        </TD>
                        <TD>{timeAgo(row.last_seen_at)}</TD>
                      </tr>
                    );
                  })}
                </TBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm">
                Todos los equipos activos están en línea. 🎉
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
