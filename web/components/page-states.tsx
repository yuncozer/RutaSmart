"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Cargando">
      <div className="bg-muted h-8 w-48 rounded-lg" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-muted h-24 rounded-2xl" />
        ))}
      </div>
      <div className="bg-muted h-72 rounded-2xl" />
    </div>
  );
}

export function PageError({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
      <AlertTriangle className="text-danger size-10" />
      <p className="font-medium">Algo salió mal al cargar esta página.</p>
      <p className="text-muted-foreground text-sm">Revisa tu conexión e inténtalo de nuevo.</p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
