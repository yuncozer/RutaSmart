import * as React from "react";
import { cn } from "@/lib/utils";

const styles = {
  info: "border-navy-500/30 bg-navy-100/60 text-navy-900 dark:bg-navy-800 dark:text-navy-100",
  warning: "border-accent/40 bg-accent/10 text-amber-800 dark:text-accent",
  danger: "border-danger/30 bg-danger/10 text-danger",
  success: "border-success/30 bg-success/10 text-success",
};

export function Alert({
  variant = "info",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: keyof typeof styles }) {
  return (
    <div
      role="status"
      className={cn("rounded-xl border px-4 py-3 text-sm", styles[variant], className)}
      {...props}
    />
  );
}
