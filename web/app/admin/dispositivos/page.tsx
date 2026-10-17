import { BatteryMedium, Cpu, MapPin, Signal } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { ActionButton, ActionForm } from "@/components/action-form";
import { RegisterDeviceForm, RotateSecretButton } from "@/components/admin/device-secret";
import { DeviceStatusBadge, MODALITY_LABELS, OnlineDot } from "@/components/status-badges";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/format";
import { osmLink } from "@/lib/geo";
import type { Device } from "@/lib/types";
import { assignDevice, registerDevice, rotateDeviceSecret, setDeviceStatus } from "../actions";

export const metadata = { title: "Dispositivos" };

type Row = Device & { organization: { name: string } | null; bus: { plate: string } | null };

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("devices")
    .select(
      "id, serial, bus_id, organization_id, status, modality, firmware_version, model_version, last_seen_at, last_battery, last_rssi, last_lat, last_lng, created_at, organization:organizations(name), bus:buses(plate)",
    )
    .order("serial");
  if (estado) query = query.eq("status", estado);

  const [{ data }, { data: buses }] = await Promise.all([
    query,
    supabase
      .from("buses")
      .select("id, plate, organization:organizations(name), devices(id)")
      .eq("is_active", true)
      .order("plate"),
  ]);
  const devices = (data ?? []) as unknown as Row[];
  const busOptions = (buses ?? []) as unknown as {
    id: string;
    plate: string;
    organization: { name: string } | null;
    devices: { id: string }[];
  }[];

  const filters = [
    ["", "Todos"],
    ["active", "Activos"],
    ["inventory", "Inventario"],
    ["disabled", "Deshabilitados"],
    ["retired", "Retirados"],
  ];

  return (
    <>
      <PageHeader
        eyebrow="Equipos"
        title="Dispositivos"
        description="Equipos ESP32-S3 instalados en los buses."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Registrar dispositivo</CardTitle>
        </CardHeader>
        <CardContent>
          <RegisterDeviceForm action={registerDevice} />
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map(([value, label]) => (
          <a
            key={value}
            href={value ? `?estado=${value}` : "?"}
            className={`rounded-full border px-3 py-1 text-sm ${(estado ?? "") === value ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
          >
            {label}
          </a>
        ))}
      </div>

      {devices.length === 0 ? (
        <EmptyState icon={Cpu} title="Sin dispositivos" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {devices.map((d) => (
            <Card key={d.id}>
              <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardTitle className="font-mono">{d.serial}</CardTitle>
                  <p className="text-muted-foreground text-sm">
                    {d.organization?.name ?? "Sin organización"}
                    {d.bus ? ` · ${d.bus.plate}` : ""}
                  </p>
                </div>
                <DeviceStatusBadge status={d.status} />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <div>
                    <OnlineDot lastSeen={d.last_seen_at} />
                    <p className="text-muted-foreground text-xs">{timeAgo(d.last_seen_at)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <BatteryMedium className="text-navy-500 size-4" /> {d.last_battery ?? "—"}%
                  </div>
                  <div className="flex items-center gap-1">
                    <Signal className="text-navy-500 size-4" /> {d.last_rssi ?? "—"} dBm
                  </div>
                  <div className="text-muted-foreground text-xs">
                    fw {d.firmware_version ?? "—"}
                    <br />
                    modelo {d.model_version ?? "—"}
                  </div>
                </div>
                <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span>Modalidad: {d.modality ? MODALITY_LABELS[d.modality] : "sin definir"}</span>
                  {d.last_lat != null && d.last_lng != null ? (
                    <a
                      href={osmLink(d.last_lat, d.last_lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-link flex items-center gap-1 hover:underline"
                    >
                      <MapPin className="size-3" /> {d.last_lat.toFixed(5)}, {d.last_lng.toFixed(5)}
                    </a>
                  ) : (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" /> Sin ubicación GPS
                    </span>
                  )}
                </div>

                {d.status !== "retired" ? (
                  <ActionForm
                    action={assignDevice}
                    submitLabel="Guardar asignación"
                    submitVariant="secondary"
                    submitClassName="sm:w-fit"
                  >
                    <input type="hidden" name="id" value={d.id} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Bus" htmlFor={`bus-${d.id}`}>
                        <Select id={`bus-${d.id}`} name="bus_id" defaultValue={d.bus_id ?? ""}>
                          <option value="">— En inventario —</option>
                          {busOptions
                            .filter((b) => b.id === d.bus_id || b.devices.length === 0)
                            .map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.plate} · {b.organization?.name}
                              </option>
                            ))}
                        </Select>
                      </Field>
                      <Field label="Modalidad" htmlFor={`mod-${d.id}`}>
                        <Select id={`mod-${d.id}`} name="modality" defaultValue={d.modality ?? ""}>
                          <option value="">Sin cambio</option>
                          <option value="purchase">Compra</option>
                          <option value="rental">Alquiler</option>
                        </Select>
                      </Field>
                    </div>
                  </ActionForm>
                ) : null}

                <div className="flex flex-wrap items-start gap-2 border-t pt-3">
                  {d.status === "disabled" ? (
                    <ActionButton action={setDeviceStatus} fields={{ id: d.id, status: "active" }}>
                      Reactivar
                    </ActionButton>
                  ) : d.status !== "retired" ? (
                    <ActionButton
                      action={setDeviceStatus}
                      fields={{ id: d.id, status: "disabled" }}
                      confirm={`¿Deshabilitar ${d.serial}? Dejará de enviar conteos.`}
                    >
                      Deshabilitar
                    </ActionButton>
                  ) : null}
                  {d.status !== "retired" ? (
                    <ActionButton
                      action={setDeviceStatus}
                      fields={{ id: d.id, status: "retired" }}
                      variant="ghost"
                      confirm={`¿Retirar ${d.serial}? Ya no podrá autenticarse.`}
                    >
                      Retirar
                    </ActionButton>
                  ) : null}
                  <RotateSecretButton action={rotateDeviceSecret} id={d.id} serial={d.serial} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
