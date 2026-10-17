/** Render del equipo RutaSmart RU7 (ESP32-S3 + cámara + IR). SVG puro. */
export function DeviceVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
      <div className="bg-cyan/20 absolute inset-8 -z-10 rounded-full blur-3xl" />
      <svg viewBox="0 0 360 260" className="animate-float-slow w-full drop-shadow-2xl">
        <defs>
          <linearGradient id="shell" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#c7d2e6" />
          </linearGradient>
          <linearGradient id="face" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#142a4f" />
            <stop offset="100%" stopColor="#06122a" />
          </linearGradient>
          <radialGradient id="lens" cx="0.4" cy="0.35" r="0.7">
            <stop offset="0%" stopColor="#7fe7ff" />
            <stop offset="35%" stopColor="#1e3a6e" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>
        </defs>
        {/* Carcasa */}
        <rect x="40" y="50" width="280" height="160" rx="36" fill="url(#shell)" />
        <rect x="56" y="66" width="248" height="128" rx="26" fill="url(#face)" />
        {/* Lente */}
        <circle
          cx="180"
          cy="130"
          r="40"
          fill="#0b1f3a"
          stroke="#3b5ba5"
          strokeOpacity="0.6"
          strokeWidth="2"
        />
        <circle cx="180" cy="130" r="28" fill="url(#lens)" />
        <circle cx="170" cy="120" r="6" fill="white" fillOpacity="0.6" />
        {/* LEDs infrarrojos */}
        {[-1, 1].map((s) =>
          [0, 1, 2].map((i) => (
            <circle
              key={`${s}-${i}`}
              cx={180 + s * (78 + i * 14)}
              cy={130}
              r="5"
              fill="#2a0f12"
              stroke="#f5a524"
              strokeOpacity="0.5"
            />
          )),
        )}
        {/* Sensor láser */}
        <rect x="168" y="78" width="24" height="8" rx="4" fill="#38d6ff" fillOpacity="0.5" />
        {/* LED de estado */}
        <circle cx="282" cy="86" r="4" fill="#22c55e" />
        <circle cx="282" cy="86" r="8" fill="#22c55e" fillOpacity="0.25" />
        {/* Marca */}
        <text
          x="84"
          y="182"
          fill="#9fb0cf"
          fontSize="11"
          fontFamily="var(--font-geist-sans)"
          fontWeight="600"
        >
          RutaSmart RU7
        </text>
        {/* Soporte */}
        <rect x="150" y="30" width="60" height="24" rx="6" fill="#94a3b8" />
      </svg>
    </div>
  );
}
