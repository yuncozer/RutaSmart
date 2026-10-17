import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BatteryMedium,
  Clock,
  MapPin,
  Signal,
  UserX,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { CountsChart } from "@/components/charts/counts-chart";
import { OnlineDot } from "@/components/status-badges";
import { FeatureLocked } from "@/components/app/subscription-gate";
import { BusRouteMap } from "@/components/map/bus-route-map";
import type { DotPoint, Hotspot } from "@/components/map";
import { averageMovingSpeed, osmLink, routeDistanceKm, type LatLng } from "@/lib/geo";
import { requireAppContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatDate, formatNumber, localeFor, timeAgo, todayIn } from "@/lib/format";
import {
  dailySeries,
  isValidIsoDate,
  normalizeDaily,
  shortDayLabel,
  totalsFor,
} from "@/lib/dashboard";
import { hasFeature } from "@/lib/plans";
import type { Bus, Device, HourlyCountRow } from "@/lib/types";

export const metadata = { title: "Detalle del bus" };

export default async function BusDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fecha?: string }>;
}) {
  const [{ id }, { fecha }] = await Promise.all([params, searchParams]);
  const ctx = await requireAppContext();
  const supabase = await createClient();
  const { data: bus } = await supabase.from("buses").select("*").eq("id", id).maybeSingle<Bus>();
  if (!bus || bus.organization_id !== ctx.org.id) notFound();

  const today = todayIn(ctx.org.timezone);
  const date = isValidIsoDate(fecha) && fecha <= today ? fecha : today;
  const f = ctx.access.features;
  const country = ctx.org.country;
  const hourlyEnabled = hasFeature(f, "hourly_dashboard");
  const from = addDays(date, -13);

  const gpsEnabled = hasFeature(f, "gps_tracking");
  const empty = Promise.resolve({ data: [] as Record<string, unknown>[] });
  const [
    { data: daily },
    { data: hourly },
    { data: device },
    { data: routeRows },
    { data: pointRows },
    { data: spotRows },
  ] = await Promise.all([
    supabase.rpc("daily_counts", { p_org_id: ctx.org.id, p_from: from, p_to: date, p_bus_id: id }),
    hourlyEnabled
      ? supabase.rpc("hourly_counts", { p_bus_id: id, p_date: date })
      : Promise.resolve({ data: [] as HourlyCountRow[] }),
    supabase
      .from("devices")
      .select(
        "id, serial, status, last_seen_at, last_battery, last_rssi, firmware_version, last_lat, last_lng",
      )
      .eq("bus_id", id)
      .maybeSingle<Device>(),
    gpsEnabled ? supabase.rpc("bus_route", { p_bus_id: id, p_date: date }) : empty,
    gpsEnabled ? supabase.rpc("boarding_points", { p_bus_id: id, p_date: date }) : empty,
    gpsEnabled
      ? supabase.rpc("stop_hotspots", {
          p_org_id: ctx.org.id,
          p_from: addDays(date, -6),
          p_to: date,
          p_bus_id: id,
          p_limit: 8,
        })
      : empty,
  ]);

  // GPS: recorrido, subidas/bajadas con ubicación y paradas principales
  const routeData = ((routeRows ?? []) as Record<string, unknown>[]).map((r) => ({
    lat: Number(r.lat),
    lng: Number(r.lng),
    speed: r.speed_kmh == null ? null : Number(r.speed_kmh),
    at: String(r.recorded_at),
  }));
  const route: LatLng[] = routeData.map(({ lat, lng }) => ({ lat, lng }));
  const dots: DotPoint[] = ((pointRows ?? []) as Record<string, unknown>[]).map((p) => ({
    lat: Number(p.lat),
    lng: Number(p.lng),
    kind: p.direction === "out" ? "out" : "in",
  }));
  const hotspots: Hotspot[] = ((spotRows ?? []) as Record<string, unknown>[]).map((h) => ({
    lat: Number(h.lat),
    lng: Number(h.lng),
    ins: Number(h.ins),
    outs: Number(h.outs),
    total: Number(h.total),
  }));
  const km = routeDistanceKm(route);
  const avgSpeed = averageMovingSpeed(routeData.map((r) => r.speed));
  const timeFmt = new Intl.DateTimeFormat(localeFor(country), {
    timeZone: ctx.org.timezone,
    hour: "2-digit",
    minute: "2-digit",
  });

  const rows = normalizeDaily(daily);
  const t = totalsFor(rows, date, id);
  const hours = ((hourly ?? []) as HourlyCountRow[]).map((h) => ({
    hour: Number(h.hour),
    ins: Number(h.ins),
    outs: Number(h.outs),
    driver: Number(h.driver_crossings),
  }));
  const serviceHours = hours.filter((h) => h.hour >= 5 && h.hour <= 22);
  const peak = hours.reduce((best, h) => (h.ins > best.ins ? h : best), {
    hour: -1,
    ins: 0,
    outs: 0,
    driver: 0,
  });
  const series = dailySeries(rows, from, date, id).map((d) => ({
    label: shortDayLabel(d.day, localeFor(country)),
    ins: d.ins,
    outs: d.outs,
  }));
  const driverEnabled = hasFeature(f, "driver_exclusion");

  return (
    <>
      <Link
        href="/app"
        className="text-link mb-3 inline-flex items-center gap-1 text-sm hover:underline"
      >
        <ArrowLeft className="size-4" /> Inicio
      </Link>
      <PageHeader
        eyebrow="Detalle del bus"
        title={`${bus.plate}${bus.alias ? ` · ${bus.alias}` : ""}`}
        description={bus.route_name ?? undefined}
        actions={
          <form className="flex gap-2">
            <Input
              type="date"
              name="fecha"
              defaultValue={date}
              max={today}
              className="w-40"
              aria-label="Fecha"
            />
            <Button type="submit" variant="outline">
              Ver
            </Button>
          </form>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Subidas"
          value={formatNumber(t.ins, country)}
          icon={ArrowUpRight}
          hint={formatDate(`${date}T12:00:00Z`, { country })}
        />
        <StatCard label="Bajadas" value={formatNumber(t.outs, country)} icon={ArrowDownRight} />
        <StatCard
          label="Hora pico"
          value={hourlyEnabled && peak.hour >= 0 ? `${String(peak.hour).padStart(2, "0")}:00` : "—"}
          icon={Clock}
          hint={
            hourlyEnabled && peak.hour >= 0
              ? `${peak.ins} subidas`
              : hourlyEnabled
                ? "Sin datos"
                : "Disponible en plan Pro"
          }
        />
        <StatCard
          label="Cruces del conductor"
          value={driverEnabled ? formatNumber(t.driver, country) : "—"}
          icon={UserX}
          hint={driverEnabled ? "Excluidos del total (auditoría)" : "Disponible en plan Pro"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Por hora</CardTitle>
          </CardHeader>
          <CardContent>
            {hourlyEnabled ? (
              <CountsChart
                data={serviceHours.map((h) => ({ label: `${h.hour}h`, ins: h.ins, outs: h.outs }))}
              />
            ) : (
              <FeatureLocked feature="hourly_dashboard" title="Gráfico de pasajeros por hora" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Equipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {device ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-mono">{device.serial}</span>
                  <OnlineDot lastSeen={device.last_seen_at} />
                </div>
                <p className="text-muted-foreground">
                  Última conexión: {timeAgo(device.last_seen_at)}
                </p>
                {hasFeature(f, "device_status") ? (
                  <div className="flex gap-4">
                    <span className="flex items-center gap-1">
                      <BatteryMedium className="text-navy-500 size-4" />{" "}
                      {device.last_battery ?? "—"}%
                    </span>
                    <span className="flex items-center gap-1">
                      <Signal className="text-navy-500 size-4" /> {device.last_rssi ?? "—"} dBm
                    </span>
                    <span className="text-muted-foreground">
                      fw {device.firmware_version ?? "—"}
                    </span>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    Batería y señal: disponible en plan Flota.
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Este bus aún no tiene un equipo instalado.</p>
            )}
            {device?.last_lat != null && device.last_lng != null ? (
              <div className="bg-muted/60 mt-4 flex items-start gap-2 rounded-lg p-3 text-xs">
                <MapPin className="text-navy-500 size-4 shrink-0" />
                <div>
                  <p>Última ubicación GPS</p>
                  <div className="mt-1 flex gap-3">
                    <Link href="/app/mapa" className="text-link hover:underline">
                      Ver en el mapa en vivo
                    </Link>
                    <a
                      href={osmLink(device.last_lat, device.last_lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-link hover:underline"
                    >
                      Abrir en OpenStreetMap
                    </a>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card id="recorrido" className="mt-4 scroll-mt-20">
        <CardHeader>
          <CardTitle>Recorrido y paradas</CardTitle>
        </CardHeader>
        <CardContent>
          {!gpsEnabled ? (
            <FeatureLocked feature="gps_tracking" title="Recorrido GPS y paradas" />
          ) : route.length === 0 && dots.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center text-sm">
              <MapPin className="size-6" />
              No hay datos GPS para este día. Aparecerán cuando el equipo envíe su ubicación.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
              <BusRouteMap route={route} dots={dots} hotspots={hotspots} />
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border p-3">
                    <p className="text-muted-foreground text-xs">Recorrido</p>
                    <p className="text-xl font-semibold">{formatNumber(km, country)} km</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-muted-foreground text-xs">Vel. promedio</p>
                    <p className="text-xl font-semibold">
                      {avgSpeed != null ? `${avgSpeed} km/h` : "—"}
                    </p>
                  </div>
                  <div className="col-span-2 rounded-xl border p-3">
                    <p className="text-muted-foreground text-xs">En servicio</p>
                    <p className="font-semibold">
                      {routeData.length
                        ? `${timeFmt.format(new Date(routeData[0].at))} – ${timeFmt.format(new Date(routeData[routeData.length - 1].at))}`
                        : "—"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">Paradas con más movimiento (7 días)</p>
                  {hotspots.length ? (
                    <ol className="space-y-1.5 text-sm">
                      {hotspots.map((h, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="bg-accent/20 dark:text-accent grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold text-amber-700">
                            {i + 1}
                          </span>
                          <span className="flex-1">
                            {formatNumber(h.ins, country)} suben · {formatNumber(h.outs, country)}{" "}
                            bajan
                          </span>
                          <a
                            href={osmLink(h.lat, h.lng)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-link text-xs hover:underline"
                          >
                            Ver
                          </a>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-muted-foreground text-sm">Sin datos suficientes.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Últimos 14 días</CardTitle>
        </CardHeader>
        <CardContent>
          <CountsChart data={series} />
        </CardContent>
      </Card>

      {hourlyEnabled ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Detalle por hora</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <THead>
                <tr>
                  <TH>Hora</TH>
                  <TH className="text-right">Subidas</TH>
                  <TH className="text-right">Bajadas</TH>
                  {driverEnabled ? <TH className="text-right">Conductor</TH> : null}
                </tr>
              </THead>
              <TBody>
                {hours
                  .filter((h) => h.ins || h.outs || h.driver)
                  .map((h) => (
                    <tr key={h.hour}>
                      <TD>{String(h.hour).padStart(2, "0")}:00</TD>
                      <TD className="text-right">{h.ins}</TD>
                      <TD className="text-right">{h.outs}</TD>
                      {driverEnabled ? (
                        <TD className="text-muted-foreground text-right">{h.driver}</TD>
                      ) : null}
                    </tr>
                  ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
