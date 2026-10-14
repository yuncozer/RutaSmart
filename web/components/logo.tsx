import { cn } from "@/lib/utils";

/** Logotipo de RutaSmart: ícono de bus estilizado + nombre. */
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
    </span>
  );
}
