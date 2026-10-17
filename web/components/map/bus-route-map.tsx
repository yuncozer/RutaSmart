"use client";

import { useState } from "react";
import { MapView, type DotPoint, type Hotspot } from "@/components/map";
import type { LatLng } from "@/lib/geo";
import { cn } from "@/lib/utils";

/** Recorrido del día con subidas, bajadas y paradas principales (capas activables). */
export function BusRouteMap({
  route,
  dots,
  hotspots,
}: {
  route: LatLng[];
  dots: DotPoint[];
  hotspots: Hotspot[];
}) {
  const [layers, setLayers] = useState({ route: true, in: true, out: false, hotspots: true });
  const toggle = (k: keyof typeof layers) => setLayers((l) => ({ ...l, [k]: !l[k] }));

  const chips: { key: keyof typeof layers; label: string; swatch: string; count?: number }[] = [
    { key: "route", label: "Recorrido", swatch: "bg-[#5b8cff]" },
    {
      key: "in",
      label: "Subidas",
      swatch: "bg-[var(--chart-in)]",
      count: dots.filter((d) => d.kind === "in").length,
    },
    {
      key: "out",
      label: "Bajadas",
      swatch: "bg-[var(--chart-out)]",
      count: dots.filter((d) => d.kind === "out").length,
    },
    { key: "hotspots", label: "Paradas principales", swatch: "bg-accent/60" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => toggle(c.key)}
            aria-pressed={layers[c.key]}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors",
              layers[c.key] ? "bg-card font-medium" : "text-muted-foreground opacity-60",
            )}
          >
            <span className={cn("size-2.5 rounded-full", c.swatch)} />
            {c.label}
            {c.count != null ? <span className="text-muted-foreground">({c.count})</span> : null}
          </button>
        ))}
      </div>
      <div className="h-[420px] overflow-hidden rounded-xl border">
        <MapView
          route={layers.route ? route : []}
          dots={dots.filter((d) => (d.kind === "in" ? layers.in : layers.out))}
          hotspots={layers.hotspots ? hotspots : []}
        />
      </div>
    </div>
  );
}
