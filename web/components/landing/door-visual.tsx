/**
 * Ilustración del conteo: sensor sobre la puerta, campo de visión,
 * línea virtual y pasajeros cruzándola. SVG puro con animación CSS.
 */
export function DoorVisual() {
  return (
    <div
      className="bg-navy-950 relative overflow-hidden rounded-3xl p-6 ring-1 ring-white/10"
      aria-hidden="true"
    >
      <div className="bg-grid mask-radial absolute inset-0 opacity-60" />
      <svg viewBox="0 0 320 260" className="relative w-full">
        <defs>
          <linearGradient id="cone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38d6ff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#5b8cff" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="door" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1e3a6e" />
            <stop offset="100%" stopColor="#0b1f3a" />
          </linearGradient>
        </defs>

        {/* Marco de la puerta */}
        <rect
          x="70"
          y="40"
          width="180"
          height="200"
          rx="10"
          fill="url(#door)"
          stroke="#3b5ba5"
          strokeOpacity="0.6"
        />
        <line x1="160" y1="44" x2="160" y2="236" stroke="#3b5ba5" strokeOpacity="0.35" />

        {/* Campo de visión */}
        <path d="M160 34 L78 236 L242 236 Z" fill="url(#cone)" />

        {/* Línea de escaneo */}
        <g className="animate-scan">
          <rect x="84" y="60" width="152" height="2" rx="1" fill="#38d6ff" opacity="0.9" />
        </g>

        {/* Línea virtual de conteo */}
        <line
          x1="60"
          y1="170"
          x2="260"
          y2="170"
          stroke="#f5a524"
          strokeWidth="2"
          strokeDasharray="6 6"
        />
        <text x="262" y="166" fill="#f5a524" fontSize="9" fontFamily="var(--font-geist-mono)">
          LÍNEA
        </text>

        {/* Sensor */}
        <rect x="132" y="16" width="56" height="22" rx="7" fill="#e6ecf7" />
        <circle cx="160" cy="27" r="7" fill="#06122a" />
        <circle cx="160" cy="27" r="3.5" fill="#38d6ff" />
        <circle cx="142" cy="27" r="2" fill="#f5a524" />
        <circle cx="178" cy="27" r="2" fill="#f5a524" />

        {/* Pasajero que sube */}
        <g>
          <circle cx="120" cy="196" r="13" fill="#5b8cff" fillOpacity="0.25" stroke="#5b8cff" />
          <circle cx="120" cy="196" r="5" fill="#5b8cff" />
          <path
            d="M120 180 L120 150 M113 157 L120 150 L127 157"
            stroke="#5b8cff"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        {/* Pasajero que baja */}
        <g>
          <circle cx="200" cy="140" r="13" fill="#f5a524" fillOpacity="0.2" stroke="#f5a524" />
          <circle cx="200" cy="140" r="5" fill="#f5a524" />
          <path
            d="M200 156 L200 190 M193 183 L200 190 L207 183"
            stroke="#f5a524"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>

      <div className="relative mt-2 grid grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-3">
          <p className="text-[11px] uppercase tracking-wider text-white/50">Suben</p>
          <p className="text-electric text-2xl font-semibold">+1</p>
        </div>
        <div className="glass rounded-2xl p-3">
          <p className="text-[11px] uppercase tracking-wider text-white/50">Bajan</p>
          <p className="text-accent text-2xl font-semibold">+1</p>
        </div>
      </div>
    </div>
  );
}
