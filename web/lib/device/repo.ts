import type { DeviceStatus } from "@/lib/types";
import type { HeartbeatInput } from "./schemas";

/** Datos del dispositivo necesarios para la API (incluye el hash del secreto). */
export interface DeviceRecord {
  id: string;
  serial: string;
  secret_hash: string;
  status: DeviceStatus;
  bus_id: string | null;
  organization_id: string | null;
  firmware_version: string | null;
  model_version: string | null;
}

export interface CountEventRow {
  id: string;
  device_id: string;
  bus_id: string;
  organization_id: string;
  occurred_at: string;
  direction: "in" | "out";
  is_driver: boolean;
  confidence: number | null;
  lat: number | null;
  lng: number | null;
}

export interface PositionRow {
  id: string;
  device_id: string;
  bus_id: string;
  organization_id: string;
  recorded_at: string;
  lat: number;
  lng: number;
  speed_kmh: number | null;
  heading: number | null;
  accuracy_m: number | null;
  satellites: number | null;
}

export interface FirmwareRelease {
  version: string;
  model_version: string | null;
  file_path: string;
  checksum_sha256: string;
}

/**
 * Acceso a datos de la API de dispositivos.
 * La implementación real usa Supabase con service role (supabase-repo.ts);
 * los tests usan una implementación en memoria.
 */
export interface DeviceRepo {
  findBySerial(serial: string): Promise<DeviceRecord | null>;
  /** Inserta con ON CONFLICT (id) DO NOTHING y devuelve cuántas filas se insertaron. */
  insertEvents(rows: CountEventRow[]): Promise<number>;
  /** Inserta posiciones GPS (ON CONFLICT DO NOTHING) y devuelve cuántas se insertaron. */
  insertPositions(rows: PositionRow[]): Promise<number>;
  /** Actualiza la última posición conocida del dispositivo. */
  updateLastPosition(deviceId: string, lat: number, lng: number, at: Date): Promise<void>;
  recordHeartbeat(device: DeviceRecord, hb: HeartbeatInput, at: Date): Promise<void>;
  touch(deviceId: string, at: Date): Promise<void>;
  isDriverExclusionEnabled(organizationId: string | null): Promise<boolean>;
  latestStableFirmware(): Promise<FirmwareRelease | null>;
  signFirmwareUrl(filePath: string): Promise<string | null>;
}
