import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, STATUS_VARIANT } from "@/lib/subscription";
import type { DeviceStatus, SubscriptionStatus } from "@/lib/types";

export function SubscriptionBadge({ status }: { status: SubscriptionStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>;
}

const DEVICE_LABELS: Record<DeviceStatus, string> = {
  inventory: "Inventario",
  active: "Activo",
  disabled: "Deshabilitado",
  retired: "Retirado",
};
const DEVICE_VARIANT = {
  inventory: "muted",
  active: "success",
  disabled: "danger",
  retired: "muted",
} as const;

export function DeviceStatusBadge({ status }: { status: DeviceStatus }) {
  return <Badge variant={DEVICE_VARIANT[status]}>{DEVICE_LABELS[status]}</Badge>;
}

/** En línea si reportó en la última hora. */
export function isOnline(lastSeen: string | null, now = Date.now()) {
  return Boolean(lastSeen && now - new Date(lastSeen).getTime() < 60 * 60 * 1000);
}

export function OnlineDot({ lastSeen }: { lastSeen: string | null }) {
  const online = isOnline(lastSeen);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={`size-2 rounded-full ${online ? "bg-success" : "bg-danger"}`} />
      {online ? "En línea" : "Sin conexión"}
    </span>
  );
}

export const MODALITY_LABELS = { purchase: "Compra", rental: "Alquiler" } as const;
export const METHOD_LABELS = {
  pago_movil: "Pago móvil",
  zelle: "Zelle",
  binance: "Binance",
  transfer: "Transferencia",
  cash: "Efectivo",
  other: "Otro",
} as const;
