"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface CountsPoint {
  label: string;
  ins: number;
  outs?: number;
}

const fmt = new Intl.NumberFormat("es-VE");

/**
 * Barras de subidas (y opcionalmente bajadas) por día u hora.
 * Una sola escala; leyenda y tooltip siempre presentes.
 */
export function CountsChart({
  data,
  showOuts = true,
  height = 260,
}: {
  data: CountsPoint[];
  showOuts?: boolean;
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 4, left: -16, bottom: 0 }}
          barGap={2}
          barCategoryGap="20%"
        >
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
            interval="preserveStartEnd"
            minTickGap={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
            allowDecimals={false}
            width={48}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            formatter={(v, name) => [fmt.format(Number(v ?? 0)), String(name)]}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              color: "var(--card-foreground)",
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--muted-foreground)" }}
          />
          {showOuts ? (
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, color: "var(--chart-axis)" }}
            />
          ) : null}
          <Bar
            dataKey="ins"
            name="Subidas"
            fill="var(--chart-in)"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
            isAnimationActive={false}
          />
          {showOuts ? (
            <Bar
              dataKey="outs"
              name="Bajadas"
              fill="var(--chart-out)"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
              isAnimationActive={false}
            />
          ) : null}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
