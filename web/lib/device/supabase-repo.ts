import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DeviceRepo, DeviceRecord, FirmwareRelease } from "./repo";

const SIGNED_URL_TTL_S = 60 * 60;

/** Implementación de DeviceRepo con Supabase (service role, solo servidor). */
export function createSupabaseDeviceRepo(): DeviceRepo {
  const db = createAdminClient();

  return {
    async findBySerial(serial) {
      const { data, error } = await db
        .from("devices")
        .select(
          "id, serial, secret_hash, status, bus_id, organization_id, firmware_version, model_version",
        )
        .eq("serial", serial)
        .maybeSingle();
      if (error) throw error;
      return data as DeviceRecord | null;
    },

    async insertEvents(rows) {
      if (!rows.length) return 0;
      const { data, error } = await db
        .from("count_events")
        .upsert(rows, { onConflict: "id", ignoreDuplicates: true })
        .select("id");
      if (error) throw error;
      return data?.length ?? 0;
    },

    async insertPositions(rows) {
      if (!rows.length) return 0;
      const { data, error } = await db
        .from("device_positions")
        .upsert(rows, { onConflict: "id", ignoreDuplicates: true })
        .select("id");
      if (error) throw error;
      return data?.length ?? 0;
    },

    async updateLastPosition(deviceId, lat, lng, at) {
      const { error } = await db
        .from("devices")
        .update({ last_lat: lat, last_lng: lng, last_seen_at: at.toISOString() })
        .eq("id", deviceId);
      if (error) throw error;
    },

    async recordHeartbeat(device, hb, at) {
      const nowIso = at.toISOString();
      const update: Record<string, unknown> = { last_seen_at: nowIso };
      if (hb.battery != null) update.last_battery = hb.battery;
      if (hb.rssi != null) update.last_rssi = hb.rssi;
      if (hb.lat != null && hb.lng != null) {
        update.last_lat = hb.lat;
        update.last_lng = hb.lng;
      }
      if (hb.firmware_version) update.firmware_version = hb.firmware_version;
      if (hb.model_version) update.model_version = hb.model_version;

      const [u, i] = await Promise.all([
        db.from("devices").update(update).eq("id", device.id),
        db.from("device_heartbeats").insert({
          device_id: device.id,
          reported_at: nowIso,
          battery: hb.battery ?? null,
          rssi: hb.rssi ?? null,
          free_storage: hb.free_storage_mb ?? null,
          firmware_version: hb.firmware_version ?? null,
          lat: hb.lat ?? null,
          lng: hb.lng ?? null,
        }),
      ]);
      if (u.error) throw u.error;
      if (i.error) throw i.error;
    },

    async touch(deviceId, at) {
      await db.from("devices").update({ last_seen_at: at.toISOString() }).eq("id", deviceId);
    },

    async isDriverExclusionEnabled(organizationId) {
      if (!organizationId) return false;
      const { data } = await db
        .from("subscriptions")
        .select("status, plan:plans(features)")
        .eq("organization_id", organizationId)
        .neq("status", "canceled")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const plan = (data as { plan?: { features?: Record<string, unknown> } } | null)?.plan;
      return Boolean(plan?.features?.driver_exclusion);
    },

    async latestStableFirmware() {
      const { data } = await db
        .from("firmware_releases")
        .select("version, model_version, file_path, checksum_sha256")
        .eq("is_stable", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as FirmwareRelease | null;
    },

    async signFirmwareUrl(filePath) {
      const { data, error } = await db.storage
        .from("firmware")
        .createSignedUrl(filePath, SIGNED_URL_TTL_S);
      if (error) return null;
      return data.signedUrl;
    },
  };
}
