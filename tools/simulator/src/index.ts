/**
 * Simulador de dispositivo RutaSmart.
 * Genera viajes realistas y los envía a la API como lo haría el ESP32-S3.
 *
 *   pnpm simulate -- --serial RS-000001 --secret dev-secret-1 --days 1
 *   pnpm simulate -- --buses 3 --days 2 --offline
 */
import { parseArgs } from "node:util";
import {
  request,
  type ConfigResponse,
  type DeviceCredentials,
  type EventsResponse,
} from "./client.js";
import { createRng } from "./rng.js";
import { simulateDay, type SimEvent } from "./trips.js";

const HELP = `
Simulador de dispositivo RutaSmart

Opciones:
  --serial <RS-000001>   Serial del dispositivo (por defecto RS-000001)
  --secret <secreto>     Secreto del dispositivo (por defecto dev-secret-1)
  --api-url <url>        URL de la app (por defecto http://localhost:3000)
  --days <n>             Días a simular hacia atrás, incluyendo hoy hasta ahora (por defecto 1)
  --buses <n>            Simula n dispositivos: RS-000001..n con dev-secret-1..n
  --utc-offset <h>       Desfase horario local (Caracas -4, Bogotá -5). Por defecto -4
  --offline              Acumula todo sin conexión y lo envía al final en lote,
                         reenviando parte de los eventos para probar la idempotencia
  --batch <n>            Eventos por request (máx. 500, por defecto 500)
  --seed <n>             Semilla para resultados reproducibles
  --dry-run              Solo genera y muestra el resumen, sin enviar
  --help                 Muestra esta ayuda
`;

const { values } = parseArgs({
  args: process.argv.slice(2).filter((a) => a !== "--"),
  options: {
    serial: { type: "string", default: "RS-000001" },
    secret: { type: "string", default: "dev-secret-1" },
    "api-url": {
      type: "string",
      default: process.env.RUTASMART_API_URL ?? "http://localhost:3000",
    },
    days: { type: "string", default: "1" },
    buses: { type: "string" },
    "utc-offset": { type: "string", default: "-4" },
    offline: { type: "boolean", default: false },
    batch: { type: "string", default: "500" },
    seed: { type: "string" },
    "dry-run": { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
});

if (values.help) {
  console.log(HELP);
  process.exit(0);
}

const days = Math.max(1, Number(values.days));
const utcOffset = Number(values["utc-offset"]);
const batchSize = Math.min(500, Math.max(1, Number(values.batch)));
const seed = values.seed ? Number(values.seed) : Date.now() % 1_000_000;

const devices: DeviceCredentials[] = values.buses
  ? Array.from({ length: Number(values.buses) }, (_, i) => ({
      serial: `RS-${String(i + 1).padStart(6, "0")}`,
      secret: `dev-secret-${i + 1}`,
      apiUrl: values["api-url"]!,
    }))
  : [{ serial: values.serial!, secret: values.secret!, apiUrl: values["api-url"]! }];

function localDate(offsetDays: number) {
  const now = new Date(Date.now() + utcOffset * 3600_000);
  now.setUTCDate(now.getUTCDate() - offsetDays);
  return now.toISOString().slice(0, 10);
}

async function sendInBatches(creds: DeviceCredentials, events: SimEvent[]) {
  const totals = { accepted: 0, duplicates: 0, rejected: 0 };
  for (let i = 0; i < events.length; i += batchSize) {
    const res = await request<EventsResponse>(creds, "POST", "events", {
      events: events.slice(i, i + batchSize),
    });
    totals.accepted += res.accepted;
    totals.duplicates += res.duplicates;
    totals.rejected += res.rejected.length;
  }
  return totals;
}

async function runDevice(creds: DeviceCredentials, index: number) {
  const tag = `[${creds.serial}]`;
  const rng = createRng(seed + index * 7919);
  const now = new Date();

  // 1) Configuración (como al encender el equipo)
  let config: ConfigResponse | null = null;
  if (!values["dry-run"]) {
    config = await request<ConfigResponse>(creds, "GET", "config");
    console.log(
      `${tag} config: enabled=${config.enabled} assigned=${config.assigned} sync=${config.sync_interval_s}s ota=${config.firmware.update_available ? config.firmware.version : "no"}`,
    );
    if (!config.enabled) {
      console.log(`${tag} ⛔ dispositivo deshabilitado por el servidor; no se envían eventos.`);
      return;
    }
    if (!config.assigned) {
      console.log(`${tag} ⚠️  dispositivo sin bus asignado; los eventos quedan en cola local.`);
      return;
    }
  }

  // 2) Generar los días
  const all: SimEvent[] = [];
  for (let d = days - 1; d >= 0; d--) {
    const date = localDate(d);
    const dayEvents = simulateDay(rng, { date, utcOffsetHours: utcOffset, until: now });
    const ins = dayEvents.filter((e) => e.direction === "in" && !e.is_driver).length;
    const driver = dayEvents.filter((e) => e.is_driver).length;
    console.log(
      `${tag} ${date}: ${dayEvents.length} eventos (${ins} subidas, ${driver} cruces del conductor)`,
    );
    all.push(...dayEvents);
  }

  if (values["dry-run"]) return;

  // 3) Enviar
  if (values.offline) {
    console.log(`${tag} 📴 modo sin conexión: ${all.length} eventos en cola local…`);
    const first = await sendInBatches(creds, all);
    console.log(
      `${tag} 📶 reconectado → aceptados ${first.accepted}, duplicados ${first.duplicates}, rechazados ${first.rejected}`,
    );
    // Simula un corte justo después de enviar: el equipo no recibió el ACK y reenvía el 20 %
    const resend = all.filter(() => rng.chance(0.2));
    const second = await sendInBatches(creds, resend);
    console.log(
      `${tag} 🔁 reenvío de ${resend.length} eventos → aceptados ${second.accepted}, duplicados ${second.duplicates} (idempotencia ${second.accepted === 0 ? "OK" : "FALLÓ"})`,
    );
  } else {
    const res = await sendInBatches(creds, all);
    console.log(
      `${tag} ✅ aceptados ${res.accepted}, duplicados ${res.duplicates}, rechazados ${res.rejected}`,
    );
  }

  // 4) Heartbeat
  await request(creds, "POST", "heartbeat", {
    battery: rng.int(55, 100),
    rssi: -rng.int(50, 85),
    free_storage_mb: rng.int(9000, 14000),
    firmware_version: "0.1.0",
    model_version: "m-0.1",
    lat: all.at(-1)?.lat ?? null,
    lng: all.at(-1)?.lng ?? null,
  });
  console.log(`${tag} 💓 heartbeat enviado`);
}

console.log(
  `RutaSmart · simulador → ${devices[0].apiUrl} · ${devices.length} dispositivo(s) · ${days} día(s) · semilla ${seed}`,
);
let failed = false;
for (const [i, creds] of devices.entries()) {
  try {
    await runDevice(creds, i);
  } catch (err) {
    failed = true;
    console.error(`[${creds.serial}] ❌ ${(err as Error).message}`);
  }
}
process.exit(failed ? 1 : 0);
