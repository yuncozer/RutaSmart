// Tipos de dominio de RutaSmart (reflejan las tablas de supabase/migrations).

export type Country = "VE" | "CO";
export type MemberRole = "owner" | "driver";
export type DeviceStatus = "inventory" | "active" | "disabled" | "retired";
export type Modality = "purchase" | "rental";
export type BillingCycle = "monthly" | "annual";
export type SubscriptionStatus = "trialing" | "active" | "grace" | "expired" | "canceled" | "none";
export type PlanCode = "basic" | "pro" | "fleet";
export type PaymentMethod = "pago_movil" | "zelle" | "binance" | "transfer" | "cash" | "other";

export interface Organization {
  id: string;
  name: string;
  tax_id: string | null;
  country: Country;
  timezone: string;
  contact_phone: string | null;
  contact_email: string | null;
  created_at: string;
}

export interface Bus {
  id: string;
  organization_id: string;
  plate: string;
  alias: string | null;
  route_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Device {
  id: string;
  serial: string;
  bus_id: string | null;
  organization_id: string | null;
  status: DeviceStatus;
  modality: Modality | null;
  firmware_version: string | null;
  model_version: string | null;
  last_seen_at: string | null;
  last_battery: number | null;
  last_rssi: number | null;
  last_lat: number | null;
  last_lng: number | null;
  created_at: string;
}

export interface PlanFeatures {
  daily_counts?: boolean;
  export?: boolean;
  wifi_sync?: boolean;
  hourly_dashboard?: boolean;
  route_dashboard?: boolean;
  comparisons?: boolean;
  alerts?: boolean;
  driver_exclusion?: boolean;
  sim_4g?: boolean;
  fleet_view?: boolean;
  multi_user?: boolean;
  device_status?: boolean;
  priority_support?: boolean;
  max_users?: number;
}

export interface Plan {
  id: string;
  code: PlanCode;
  name: string;
  monthly_price_usd: number;
  features: PlanFeatures;
  is_active: boolean;
}

export interface Subscription {
  id: string;
  organization_id: string;
  plan_id: string;
  bus_quantity: number;
  modality: Modality;
  billing_cycle: BillingCycle;
  started_at: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  grace_days: number;
  status: SubscriptionStatus;
  deposit_usd: number | null;
  min_contract_months: number | null;
  fleet_discount_pct: number;
  annual_free_months: number;
  notes: string | null;
}

export interface Payment {
  id: string;
  subscription_id: string;
  amount_usd: number;
  method: PaymentMethod;
  reference: string | null;
  paid_at: string;
  period_months: number;
  registered_by: string | null;
  notes: string | null;
}

export interface DailyCountRow {
  bus_id: string;
  day: string;
  ins: number;
  outs: number;
  driver_crossings: number;
}

export interface HourlyCountRow {
  hour: number;
  ins: number;
  outs: number;
  driver_crossings: number;
}
