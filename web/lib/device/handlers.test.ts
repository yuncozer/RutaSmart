import { beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  handleConfig,
  handleEvents,
  handleHeartbeat,
  sha256Hex,
  type HandlerDeps,
} from "./handlers";
import { RateLimiter } from "./rate-limit";
import type { CountEventRow, DeviceRecord, DeviceRepo, FirmwareRelease } from "./repo";
import { compareVersions } from "./semver";

const NOW = new Date("2026-10-14T12:20:00Z");
const API = "http://localhost/api/device";

/** Repositorio en memoria que imita ON CONFLICT (id) DO NOTHING. */
class MemoryRepo implements DeviceRepo {
  devices = new Map<string, DeviceRecord>();
  events = new Map<string, CountEventRow>();
  heartbeats: unknown[] = [];
  touched: string[] = [];
  firmware: FirmwareRelease | null = null;
  driverExclusion = false;

  async findBySerial(serial: string) {
    return this.devices.get(serial) ?? null;
  }
  async insertEvents(rows: CountEventRow[]) {
    let n = 0;
    for (const r of rows) {
      if (!this.events.has(r.id)) {
        this.events.set(r.id, r);
        n++;
      }
    }
    return n;
  }
  async recordHeartbeat(device: DeviceRecord, hb: unknown) {
    this.heartbeats.push({ device: device.serial, hb });
  }
  async touch(id: string) {
    this.touched.push(id);
  }
  async isDriverExclusionEnabled() {
    return this.driverExclusion;
  }
  async latestStableFirmware() {
    return this.firmware;
  }
  async signFirmwareUrl(path: string) {
    return `https://storage.test/${path}?token=signed`;
  }
}

function device(overrides: Partial<DeviceRecord> = {}): DeviceRecord {
  return {
    id: "dev-1",
    serial: "RS-000001",
    secret_hash: sha256Hex("dev-secret-1"),
    status: "active",
    bus_id: "bus-1",
    organization_id: "org-1",
    firmware_version: "0.1.0",
    model_version: "m-0.1",
    ...overrides,
  };
}

function req(
  path: string,
  body?: unknown,
  opts: { serial?: string; secret?: string; method?: string } = {},
) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.serial !== "") headers["x-device-serial"] = opts.serial ?? "RS-000001";
  if (opts.secret !== "") headers["authorization"] = `Bearer ${opts.secret ?? "dev-secret-1"}`;
  return new Request(`${API}/${path}`, {
    method: opts.method ?? (body === undefined ? "GET" : "POST"),
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function event(overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    occurred_at: "2026-10-14T12:15:03Z",
    direction: "in",
    is_driver: false,
    confidence: 0.91,
    lat: 7.7669,
    lng: -72.225,
    ...overrides,
  };
}

let repo: MemoryRepo;
let deps: HandlerDeps;

beforeEach(() => {
  repo = new MemoryRepo();
  repo.devices.set("RS-000001", device());
  deps = { repo, limiter: new RateLimiter(60, () => NOW.getTime()), now: () => NOW };
});

describe("autenticación de dispositivos", () => {
  it("rechaza sin headers", async () => {
    const res = await handleEvents(
      req("events", { events: [event()] }, { serial: "", secret: "" }),
      deps,
    );
    expect(res.status).toBe(401);
  });

  it("rechaza secreto incorrecto", async () => {
    const res = await handleEvents(req("events", { events: [event()] }, { secret: "otro" }), deps);
    expect(res.status).toBe(401);
  });

  it("rechaza serial inexistente", async () => {
    const res = await handleConfig(req("config", undefined, { serial: "RS-999999" }), deps);
    expect(res.status).toBe(401);
  });

  it("rechaza serial con formato inválido", async () => {
    const res = await handleConfig(req("config", undefined, { serial: "hack'--" }), deps);
    expect(res.status).toBe(401);
  });

  it("dispositivo retirado → 401", async () => {
    repo.devices.set("RS-000001", device({ status: "retired" }));
    const res = await handleConfig(req("config"), deps);
    expect(res.status).toBe(401);
  });

  it("aplica rate limiting por serial", async () => {
    deps.limiter = new RateLimiter(3, () => NOW.getTime());
    for (let i = 0; i < 3; i++) expect((await handleConfig(req("config"), deps)).status).toBe(200);
    const res = await handleConfig(req("config"), deps);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeTruthy();
  });
});

describe("POST /api/device/events", () => {
  it("inserta eventos y completa bus y organización desde el dispositivo", async () => {
    const res = await handleEvents(
      req("events", { events: [event(), event({ direction: "out" })] }),
      deps,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ accepted: 2, duplicates: 0, rejected: [] });
    const stored = [...repo.events.values()];
    expect(
      stored.every(
        (e) => e.bus_id === "bus-1" && e.organization_id === "org-1" && e.device_id === "dev-1",
      ),
    ).toBe(true);
  });

  it("es idempotente: reenviar el mismo lote no duplica", async () => {
    const batch = { events: [event(), event(), event()] };
    const first = await (await handleEvents(req("events", batch), deps)).json();
    const second = await (await handleEvents(req("events", batch), deps)).json();
    expect(first).toMatchObject({ accepted: 3, duplicates: 0 });
    expect(second).toMatchObject({ accepted: 0, duplicates: 3 });
    expect(repo.events.size).toBe(3);
  });

  it("cuenta como duplicado un id repetido dentro del mismo lote", async () => {
    const e = event();
    const body = await (await handleEvents(req("events", { events: [e, { ...e }] }), deps)).json();
    expect(body).toMatchObject({ accepted: 1, duplicates: 1 });
  });

  it("lote parcialmente reenviado tras corte de conexión", async () => {
    const a = event();
    const b = event();
    await handleEvents(req("events", { events: [a] }), deps);
    const body = await (await handleEvents(req("events", { events: [a, b] }), deps)).json();
    expect(body).toMatchObject({ accepted: 1, duplicates: 1 });
  });

  it("rechaza eventos inválidos sin perder los válidos", async () => {
    const good = event();
    const body = await (
      await handleEvents(
        req("events", {
          events: [
            good,
            event({ direction: "sideways" }),
            event({ occurred_at: "2026-10-15T12:00:00Z" }),
          ],
        }),
        deps,
      )
    ).json();
    expect(body.accepted).toBe(1);
    expect(body.rejected.map((r: { reason: string }) => r.reason)).toEqual([
      "invalid_event",
      "occurred_at_in_future",
    ]);
  });

  it("rechaza más de 500 eventos", async () => {
    const events = Array.from({ length: 501 }, () => event());
    const res = await handleEvents(req("events", { events }), deps);
    expect(res.status).toBe(400);
  });

  it("rechaza cuerpo vacío o JSON inválido", async () => {
    const bad = new Request(`${API}/events`, {
      method: "POST",
      headers: { "x-device-serial": "RS-000001", authorization: "Bearer dev-secret-1" },
      body: "{no es json",
    });
    expect((await handleEvents(bad, deps)).status).toBe(400);
  });

  it("dispositivo deshabilitado → 403", async () => {
    repo.devices.set("RS-000001", device({ status: "disabled" }));
    const res = await handleEvents(req("events", { events: [event()] }), deps);
    expect(res.status).toBe(403);
  });

  it("dispositivo sin bus asignado → 409", async () => {
    repo.devices.set(
      "RS-000001",
      device({ status: "inventory", bus_id: null, organization_id: null }),
    );
    const res = await handleEvents(req("events", { events: [event()] }), deps);
    expect(res.status).toBe(409);
  });
});

describe("POST /api/device/heartbeat", () => {
  it("registra el heartbeat", async () => {
    const res = await handleHeartbeat(
      req("heartbeat", {
        battery: 87,
        rssi: -67,
        free_storage_mb: 12000,
        firmware_version: "0.1.0",
        lat: 7.76,
        lng: -72.22,
      }),
      deps,
    );
    expect(res.status).toBe(200);
    expect(repo.heartbeats).toHaveLength(1);
  });

  it("valida rangos", async () => {
    const res = await handleHeartbeat(req("heartbeat", { battery: 150 }), deps);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/device/config", () => {
  it("devuelve configuración sin actualización disponible", async () => {
    const body = await (await handleConfig(req("config"), deps)).json();
    expect(body).toEqual({
      enabled: true,
      assigned: true,
      server_time: NOW.toISOString(),
      sync_interval_s: 300,
      driver_exclusion_enabled: false,
      firmware: { update_available: false },
    });
  });

  it("enabled=false si el dispositivo está deshabilitado (alquiler impago)", async () => {
    repo.devices.set("RS-000001", device({ status: "disabled" }));
    const body = await (await handleConfig(req("config"), deps)).json();
    expect(body.enabled).toBe(false);
  });

  it("ofrece OTA con signed URL si hay una versión estable más nueva", async () => {
    repo.firmware = {
      version: "0.2.0",
      model_version: "m-0.2",
      file_path: "0.2.0/firmware.bin",
      checksum_sha256: "abc",
    };
    repo.driverExclusion = true;
    const body = await (await handleConfig(req("config"), deps)).json();
    expect(body.driver_exclusion_enabled).toBe(true);
    expect(body.firmware).toEqual({
      update_available: true,
      version: "0.2.0",
      url: "https://storage.test/0.2.0/firmware.bin?token=signed",
      sha256: "abc",
    });
  });

  it("no ofrece OTA si la versión instalada es igual o mayor", async () => {
    repo.firmware = {
      version: "0.1.0",
      model_version: null,
      file_path: "x",
      checksum_sha256: "abc",
    };
    const body = await (await handleConfig(req("config"), deps)).json();
    expect(body.firmware.update_available).toBe(false);
  });
});

describe("compareVersions", () => {
  it("compara versiones semánticas", () => {
    expect(compareVersions("0.2.0", "0.1.9")).toBe(1);
    expect(compareVersions("0.10.0", "0.9.0")).toBe(1);
    expect(compareVersions("1.0.0", "1.0")).toBe(0);
    expect(compareVersions("v0.1.0", "0.1.1")).toBe(-1);
  });
});
