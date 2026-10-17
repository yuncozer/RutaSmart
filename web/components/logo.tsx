import { cn } from "@/lib/utils";
import { BRAND_MODEL } from "@/lib/brand";

/** Logotipo de RutaSmart RU7: ícono de bus estilizado + nombre + modelo. */
export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true">
        <rect
          width="32"
          height="32"
          rx="8"
          className={light ? "fill-white" : "fill-navy-900 dark:fill-navy-100"}
        />
        <rect
          x="8"
          y="7"
          width="16"
          height="15"
          rx="3"
          className={light ? "fill-navy-900" : "dark:fill-navy-900 fill-white"}
        />
        <rect x="10" y="10" width="12" height="5" rx="1" className="fill-accent" />
        <circle
          cx="12"
          cy="24"
          r="1.8"
          className={light ? "fill-navy-900" : "dark:fill-navy-900 fill-white"}
        />
        <circle
          cx="20"
          cy="24"
          r="1.8"
          className={light ? "fill-navy-900" : "dark:fill-navy-900 fill-white"}
        />
      </svg>
      <span className={cn("text-lg", light && "text-white")}>
        Ruta<span className="text-accent">Smart</span>
      </span>
      <span
        className={cn(
          "rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none tracking-wider",
          light
            ? "border-white/25 text-white/80"
            : "border-navy-900/20 text-navy-700 dark:text-navy-100 dark:border-white/20",
        )}
      >
        {BRAND_MODEL}
      </span>
    </span>
  );
}
