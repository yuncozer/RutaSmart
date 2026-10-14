import { createHash, timingSafeEqual } from "node:crypto";
import type { DeviceRecord, DeviceRepo, CountEventRow } from "./repo";
import type { RateLimiter } from "./rate-limit";
import {
  countEventSchema,
  eventsBodySchema,
  heartbeatSchema,
  MAX_EVENT_AGE_MS,
  MAX_FUTURE_SKEW_MS,
  serialSchema,
} from "./schemas";
import { compareVersions } from "./semver";

export interface HandlerDeps {
  repo: DeviceRepo;
  limiter: RateLimiter;
  now?: () => Date;
}

export const DEFAULT_SYNC_INTERVAL_S = 300;

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

function error(status: number, code: string, message: string, headers?: Record<string, string>) {
  return json({ error: code, message }, status, headers);
}

export function sha256Hex(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function safeEqualHex(a: string, b: string) {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && ba.length > 0 && timingSafeEqual(ba, bb);
}

type AuthResult = { ok: true; device: DeviceRecord } | { ok: false; response: Response };

/**
 * Autenticación del dispositivo:
 *   X-Device-Serial: RS-000123
 *   Authorization: Bearer <device_secret>
 * Se compara sha256(secreto) con devices.secret_hash. Un equipo retirado no puede autenticarse.
 */
export async function authenticateDevice(req: Request, deps: HandlerDeps): Promise<AuthResult> {
  const serial = req.headers.get("x-device-serial")?.trim() ?? "";
  const auth = req.headers.get("authorization") ?? "";
  const secret = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";

  if (!serialSchema.safeParse(serial).success || !secret) {
    return {
      ok: false,
      response: error(401, "unauthorized", "Credenciales del dispositivo ausentes o inválidas"),
    };
  }

  const rl = deps.limiter.check(serial);
  if (!rl.ok) {
    return {
      ok: false,
      response: error(429, "rate_limited", "Demasiadas solicitudes", {
        "retry-after": String(rl.retryAfterS),
      }),
    };
  }

  const device = await deps.repo.findBySerial(serial);
  if (
    !device ||
    device.status === "retired" ||
    !safeEqualHex(sha256Hex(secret), device.secret_hash)
  ) {
    return {
      ok: false,
      response: error(401, "unauthorized", "Credenciales del dispositivo inválidas"),
    };
  }
  return { ok: true, device };
}

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

/** POST /api/device/events — inserción idempotente en lote (máx. 500). */
export async function handleEvents(req: Request, deps: HandlerDeps): Promise<Response> {
  const auth = await authenticateDevice(req, deps);
  if (!auth.ok) return auth.response;
  const { device } = auth;
  const now = (deps.now ?? (() => new Date()))();

  if (device.status === "disabled") {
    return error(403, "device_disabled", "El dispositivo está deshabilitado");
  }
  if (!device.bus_id || !device.organization_id || device.status !== "active") {
    // El equipo conserva su cola local hasta que se asigne a un bus.
    return error(409, "device_not_assigned", "El dispositivo no está asignado a un bus");
  }

  const body = eventsBodySchema.safeParse(await readJson(req));
  if (!body.success) {
    return error(400, "invalid_body", "Se espera { events: [...] } con 1 a 500 eventos");
  }

  const rows = new Map<string, CountEventRow>();
  const rejected: { index: number; id?: string; reason: string }[] = [];

  body.data.events.forEach((raw, index) => {
    const parsed = countEventSchema.safeParse(raw);
    const rawId =
      typeof raw === "object" && raw && "id" in raw
        ? String((raw as { id: unknown }).id)
        : undefined;
    if (!parsed.success) {
      rejected.push({ index, id: rawId, reason: "invalid_event" });
      return;
    }
    const e = parsed.data;
    const t = new Date(e.occurred_at).getTime();
    if (t > now.getTime() + MAX_FUTURE_SKEW_MS) {
      rejected.push({ index, id: e.id, reason: "occurred_at_in_future" });
      return;
    }
    if (t < now.getTime() - MAX_EVENT_AGE_MS) {
      rejected.push({ index, id: e.id, reason: "occurred_at_too_old" });
      return;
    }
    const id = e.id.toLowerCase();
    rows.set(id, {
      id,
      device_id: device.id,
      bus_id: device.bus_id!,
      organization_id: device.organization_id!,
      occurred_at: new Date(t).toISOString(),
      direction: e.direction,
      is_driver: e.is_driver ?? false,
      confidence: e.confidence ?? null,
      lat: e.lat ?? null,
      lng: e.lng ?? null,
    });
  });

  const valid = [...rows.values()];
  const accepted = await deps.repo.insertEvents(valid);
  // Duplicados: eventos válidos que ya existían + repetidos dentro del mismo lote
  const validCount = body.data.events.length - rejected.length;
  const duplicates = validCount - accepted;

  await deps.repo.touch(device.id, now);

  return json({ accepted, duplicates, rejected });
}

/** POST /api/device/heartbeat — estado del equipo. */
export async function handleHeartbeat(req: Request, deps: HandlerDeps): Promise<Response> {
  const auth = await authenticateDevice(req, deps);
  if (!auth.ok) return auth.response;
  const now = (deps.now ?? (() => new Date()))();

  const body = heartbeatSchema.safeParse((await readJson(req)) ?? {});
  if (!body.success) {
    return error(400, "invalid_body", body.error.issues[0]?.message ?? "Heartbeat inválido");
  }
  await deps.repo.recordHeartbeat(auth.device, body.data, now);
  return json({ ok: true, server_time: now.toISOString() });
}

/** GET /api/device/config — configuración, hora del servidor y OTA. */
export async function handleConfig(req: Request, deps: HandlerDeps): Promise<Response> {
  const auth = await authenticateDevice(req, deps);
  if (!auth.ok) return auth.response;
  const { device } = auth;
  const now = (deps.now ?? (() => new Date()))();

  const [driverExclusion, release] = await Promise.all([
    deps.repo.isDriverExclusionEnabled(device.organization_id),
    deps.repo.latestStableFirmware(),
  ]);

  let firmware: { update_available: boolean; version?: string; url?: string; sha256?: string } = {
    update_available: false,
  };
  if (
    release &&
    device.status !== "disabled" &&
    (!device.firmware_version || compareVersions(release.version, device.firmware_version) > 0)
  ) {
    const url = await deps.repo.signFirmwareUrl(release.file_path);
    if (url) {
      firmware = {
        update_available: true,
        version: release.version,
        url,
        sha256: release.checksum_sha256,
      };
    }
  }

  await deps.repo.touch(device.id, now);

  return json({
    enabled: device.status !== "disabled",
    assigned: Boolean(device.bus_id) && device.status === "active",
    server_time: now.toISOString(),
    sync_interval_s: DEFAULT_SYNC_INTERVAL_S,
    driver_exclusion_enabled: driverExclusion,
    firmware,
  });
}
