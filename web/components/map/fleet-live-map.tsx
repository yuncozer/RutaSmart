"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bus, ChevronRight, Gauge, Layers, RefreshCw, SatelliteDish } from "lucide-react";
import { MapView, type BusMarker, type Hotspot } from "@/components/map";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { busGpsState, GPS_STATE_LABELS, type BusGpsState } from "@/lib/geo";
import { timeAgo } from "@/lib/format";

export interface FleetBusPosition {
  bus_id: string;
  plate: string;
  alias: string | null;
  route_name: string | null;
  device_serial: string | null;
  lat: number | null;
  lng: number | null;
  speed_kmh: number | null;
  position_at: string | null;
  ins_today: number;
}

const STATE_VARIANT: Record<BusGpsState, "success" | "default" | "muted"> = {
  moving: "success",
  stopped: "default",
  stale: "muted",
  no_gps: "muted",
};

const REFRESH_MS = 30_000;

export function FleetLiveMap({
  buses,
  hotspots,
  numberLocale,
}: {
  buses: FleetBusPosition[];
  hotspots: Hotspot[];
  numberLocale: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [showHotspots, setShowHotspots] = useState(true);
  const [refreshing, startRefresh] = useTransition();
  const [now, setNow] = useState(() => Date.now());

  // Actualización automática de posiciones
  useEffect(() => {
    const id = setInterval(() => {
      startRefresh(() => router.refresh());
      setNow(Date.now());
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  const rows = useMemo(
    () => buses.map((b) => ({ ...b, state: busGpsState(b, now) })),
    [buses, now],
  );

  const markers: BusMarker[] = rows
    .filter((b) => b.lat != null && b.lng != null)
    .map((b) => ({
      id: b.bus_id,
      lat: b.lat!,
      lng: b.lng!,
      label: b.plate,
      tone: b.state === "moving" ? "moving" : b.state === "stopped" ? "stopped" : "stale",
      detail: `${b.alias ?? b.plate} · ${GPS_STATE_LABELS[b.state]}${
        b.state === "moving" && b.speed_kmh ? ` · ${Math.round(b.speed_kmh)} km/h` : ""
      }`,
    }));

  const focusBus = rows.find((b) => b.bus_id === selected && b.lat != null);
  const fmt = new Intl.NumberFormat(numberLocale);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="relative h-[60vh] min-h-[380px] overflow-hidden rounded-2xl border lg:h-[calc(100dvh-12rem)]">
        <MapView
          buses={markers}
          selectedBusId={selected}
          onSelectBus={setSelected}
          hotspots={showHotspots ? hotspots : []}
          focus={focusBus ? { lat: focusBus.lat!, lng: focusBus.lng! } : null}
        />
        <div className="absolute right-3 top-3 z-[400] flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => setShowHotspots((v) => !v)}
            className={cn(
              "bg-card/95 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur",
              showHotspots && "ring-accent ring-2",
            )}
          >
            <Layers className="size-3.5" /> Paradas con más subidas
          </button>
          <span className="bg-card/95 text-muted-foreground flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-sm backdrop-blur">
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} /> Se actualiza cada
            30 s
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((b) => (
          <div
            key={b.bus_id}
            className={cn(
              "bg-card rounded-xl border p-3 transition-colors",
              selected === b.bus_id && "ring-accent ring-2",
            )}
          >
            <button
              type="button"
              onClick={() => setSelected(b.bus_id)}
              disabled={b.lat == null}
              className="flex w-full items-start gap-3 text-left disabled:cursor-default"
            >
              <div className="bg-navy-100 text-navy-900 dark:bg-navy-800 dark:text-navy-100 grid size-9 shrink-0 place-items-center rounded-lg">
                <Bus className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{b.plate}</p>
                  <Badge variant={STATE_VARIANT[b.state]}>{GPS_STATE_LABELS[b.state]}</Badge>
                </div>
                <p className="text-muted-foreground truncate text-xs">{b.route_name ?? b.alias}</p>
                <div className="text-muted-foreground mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {b.state === "moving" && b.speed_kmh != null ? (
                    <span className="flex items-center gap-1">
                      <Gauge className="size-3" /> {Math.round(b.speed_kmh)} km/h
                    </span>
                  ) : null}
                  <span className="flex items-center gap-1">
                    <SatelliteDish className="size-3" />
                    {b.position_at ? timeAgo(b.position_at, new Date(now)) : "sin posición"}
                  </span>
                  <span>{fmt.format(b.ins_today)} subidas hoy</span>
                </div>
              </div>
            </button>
            <Link
              href={`/app/buses/${b.bus_id}#recorrido`}
              className="text-link mt-2 flex items-center justify-end gap-0.5 text-xs hover:underline"
            >
              Ver recorrido del día <ChevronRight className="size-3" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
