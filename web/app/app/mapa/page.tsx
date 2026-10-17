import { MapPinOff } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/empty-state";
import { FeatureLocked } from "@/components/app/subscription-gate";
import { FleetLiveMap, type FleetBusPosition } from "@/components/map/fleet-live-map";
import type { Hotspot } from "@/components/map";
import { requireAppContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addDays, localeFor, todayIn } from "@/lib/format";
import { hasFeature } from "@/lib/plans";

export const metadata = { title: "Mapa en vivo" };
export const dynamic = "force-dynamic";

export default async function LiveMapPage() {
  const ctx = await requireAppContext();
  if (!hasFeature(ctx.access.features, "gps_tracking")) {
    return (
      <>
        <PageHeader title="Mapa en vivo" />
        <FeatureLocked feature="gps_tracking" title="Ubicación GPS de la flota" />
      </>
    );
  }

  const today = todayIn(ctx.org.timezone);
  const supabase = await createClient();
  const [{ data: positions, error }, { data: spots }] = await Promise.all([
    supabase.rpc("fleet_positions", { p_org_id: ctx.org.id }),
    supabase.rpc("stop_hotspots", {
      p_org_id: ctx.org.id,
      p_from: addDays(today, -6),
      p_to: today,
      p_limit: 20,
    }),
  ]);

  const buses = ((positions ?? []) as Record<string, unknown>[]).map((p): FleetBusPosition => ({
    bus_id: String(p.bus_id),
    plate: String(p.plate),
    alias: (p.alias as string) ?? null,
    route_name: (p.route_name as string) ?? null,
    device_serial: (p.device_serial as string) ?? null,
    lat: p.lat == null ? null : Number(p.lat),
    lng: p.lng == null ? null : Number(p.lng),
    speed_kmh: p.speed_kmh == null ? null : Number(p.speed_kmh),
    position_at: (p.position_at as string) ?? null,
    ins_today: Number(p.ins_today ?? 0),
  }));
  const hotspots = ((spots ?? []) as Record<string, unknown>[]).map((h): Hotspot => ({
    lat: Number(h.lat),
    lng: Number(h.lng),
    ins: Number(h.ins),
    outs: Number(h.outs),
    total: Number(h.total),
  }));

  return (
    <>
      <PageHeader
        title="Mapa en vivo"
        description="Ubicación GPS de cada bus y las paradas con más movimiento de los últimos 7 días."
      />
      {error ? (
        <Alert variant="danger" className="mb-4">
          No se pudo cargar el mapa. Intenta de nuevo.
        </Alert>
      ) : null}
      {buses.length === 0 ? (
        <EmptyState icon={MapPinOff} title="Sin buses activos" />
      ) : (
        <FleetLiveMap buses={buses} hotspots={hotspots} numberLocale={localeFor(ctx.org.country)} />
      )}
    </>
  );
}
