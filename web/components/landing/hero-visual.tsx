import { ArrowDownRight, ArrowUpRight, BatteryFull, Bus, Clock, Wifi } from "lucide-react";

/** Barras de ejemplo (subidas / bajadas por hora) para la maqueta del panel. */
const BARS = [
  [18, 12],
  [62, 40],
  [88, 70],
  [54, 61],
  [34, 30],
  [41, 38],
  [48, 44],
  [36, 40],
  [58, 46],
  [84, 72],
  [70, 81],
  [26, 34],
];

/**
 * Maqueta del producto: teléfono con el panel del cliente
 * y tarjetas flotantes con eventos en vivo. 100 % SVG/CSS.
 */
export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[400px] lg:max-w-none" aria-hidden="true">
      {/* Halo */}
      <div className="bg-electric/30 absolute inset-10 -z-10 rounded-full blur-3xl" />

      {/* Teléfono */}
      <div className="animate-float-slow relative mx-auto w-[280px] rounded-[2.75rem] bg-gradient-to-b from-white/25 to-white/5 p-[3px] shadow-2xl shadow-black/50 sm:w-[300px]">
        <div className="bg-navy-950 relative overflow-hidden rounded-[2.6rem] px-4 pb-6 pt-10">
          <div className="absolute left-1/2 top-3 h-5 w-24 -translate-x-1/2 rounded-full bg-black" />

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-white/50">Transporte Los Andes</span>
            <span className="flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-400" /> En vivo
            </span>
          </div>
          <p className="mt-3 text-[11px] uppercase tracking-wider text-white/50">Pasajeros hoy</p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-semibold tracking-tight text-white">1.248</span>
            <span className="mb-1.5 flex items-center text-xs font-medium text-emerald-300">
              <ArrowUpRight className="size-3.5" /> 12%
            </span>
          </div>

          {/* Gráfico */}
          <div className="mt-4 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/10">
            <div className="mb-2 flex items-center justify-between text-[10px] text-white/50">
              <span>Por hora</span>
              <span className="flex gap-2">
                <span className="flex items-center gap-1">
                  <span className="bg-electric size-1.5 rounded-full" /> Suben
                </span>
                <span className="flex items-center gap-1">
                  <span className="bg-accent size-1.5 rounded-full" /> Bajan
                </span>
              </span>
            </div>
            <svg viewBox="0 0 240 100" className="h-24 w-full">
              {[25, 50, 75].map((y) => (
                <line key={y} x1="0" x2="240" y1={y} y2={y} stroke="white" strokeOpacity="0.06" />
              ))}
              {BARS.map(([a, b], i) => (
                <g key={i}>
                  <rect x={i * 20 + 2} y={100 - a} width="7" height={a} rx="2" fill="#5b8cff" />
                  <rect
                    x={i * 20 + 10}
                    y={100 - b}
                    width="7"
                    height={b}
                    rx="2"
                    fill="#f5a524"
                    fillOpacity="0.85"
                  />
                </g>
              ))}
            </svg>
            <div className="mt-1 flex justify-between text-[9px] text-white/35">
              <span>5h</span>
              <span>9h</span>
              <span>13h</span>
              <span>17h</span>
            </div>
          </div>

          {/* Buses */}
          <div className="mt-3 space-y-2">
            {[
              ["ABC-123", "San Cristóbal – Táriba", "553"],
              ["XYZ-789", "San Cristóbal – Rubio", "481"],
              ["TKN-456", "Centro – Atalaya", "214"],
            ].map(([plate, route, n]) => (
              <div
                key={plate}
                className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2 ring-1 ring-white/10"
              >
                <div className="bg-electric/15 text-electric grid size-7 place-items-center rounded-lg">
                  <Bus className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white">{plate}</p>
                  <p className="truncate text-[10px] text-white/45">{route}</p>
                </div>
                <span className="text-sm font-semibold text-white">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tarjeta flotante: evento en vivo */}
      <div className="glass animate-float absolute -left-6 top-[44%] hidden w-48 rounded-2xl p-3 shadow-xl shadow-black/30 sm:block lg:-left-16">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className="animate-ping-slow absolute inline-flex size-full rounded-full bg-emerald-400" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[11px] text-white/60">Hace 2 s · Unidad 01</span>
        </div>
        <p className="mt-1.5 flex items-center gap-1 text-sm font-medium text-white">
          <ArrowUpRight className="size-4 text-emerald-300" /> Subió 1 pasajero
        </p>
      </div>

      {/* Tarjeta flotante: estado del equipo */}
      <div className="glass animate-float absolute -right-6 top-6 hidden w-48 rounded-2xl p-3 shadow-xl shadow-black/30 [animation-delay:-3s] sm:block lg:-right-16">
        <p className="font-mono text-[11px] text-white/60">RS-000124</p>
        <div className="mt-1.5 flex items-center justify-between text-xs text-white">
          <span className="flex items-center gap-1">
            <Wifi className="text-cyan size-3.5" /> En línea
          </span>
          <span className="flex items-center gap-1">
            <BatteryFull className="size-3.5 text-emerald-300" /> 92%
          </span>
        </div>
      </div>

      {/* Tarjeta flotante: hora pico */}
      <div className="glass animate-float absolute -bottom-5 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-2xl px-3 py-2 shadow-xl shadow-black/30 [animation-delay:-5s] sm:block">
        <p className="flex items-center gap-1.5 text-xs text-white">
          <Clock className="text-accent size-3.5" /> Hora pico <b>7:00 am</b>
          <ArrowDownRight className="size-3.5 text-white/40" />
        </p>
      </div>
    </div>
  );
}
