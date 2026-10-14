import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  change,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  hint?: React.ReactNode;
  /** Variación porcentual (null = sin datos para comparar) */
  change?: number | null;
  className?: string;
}) {
  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-muted-foreground text-sm">{label}</p>
        {Icon ? <Icon className="text-navy-500 size-4" /> : null}
      </div>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      {change !== undefined ? (
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-xs",
            change === null
              ? "text-muted-foreground"
              : change >= 0
                ? "text-success"
                : "text-danger",
          )}
        >
          {change === null ? (
            "Sin datos para comparar"
          ) : (
            <>
              {change >= 0 ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              {change > 0 ? "+" : ""}
              {change}% {hint}
            </>
          )}
        </p>
      ) : hint ? (
        <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
      ) : null}
    </Card>
  );
}
