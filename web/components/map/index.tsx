"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

/** Mapa (Leaflet) cargado solo en el navegador. */
export const MapView = dynamic(() => import("./map-view"), {
  ssr: false,
  loading: () => (
    <div className="bg-muted text-muted-foreground flex h-full w-full animate-pulse items-center justify-center gap-2 text-sm">
      <MapPin className="size-4" /> Cargando mapa…
    </div>
  ),
});

export type { BusMarker, DotPoint, Hotspot, MarkerTone } from "./map-view";
