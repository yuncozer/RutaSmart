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
    <Card className={cn("p-4 sm:p-5", className)}>
      <div className="flex items-center gap-3">
        {Icon ? (
          <span className="icon-chip text-navy-500 dark:text-electric grid size-9 shrink-0 place-items-center rounded-xl">
            <Icon className="size-[18px]" />
          </span>
        ) : null}
        <p className="text-muted-foreground text-sm leading-tight">{label}</p>
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
      {change !== undefined ? (
        <p
          className={cn(
            "mt-1.5 flex items-center gap-1 text-xs",
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
                <TrendingUp className="size-3.5" />
              ) : (
                <TrendingDown className="size-3.5" />
              )}
              <span className="font-medium">
                {change > 0 ? "+" : ""}
                {change}%
              </span>{" "}
              {hint}
            </>
          )}
        </p>
      ) : hint ? (
        <p className="text-muted-foreground mt-1.5 text-xs">{hint}</p>
      ) : null}
    </Card>
  );
}
