import type { PlanCode, PlanFeatures } from "@/lib/types";
import { env, isSupabaseConfigured } from "@/lib/env";

/** Nombre legible de cada función de plan (para la UI). */
export const FEATURE_LABELS: Record<keyof PlanFeatures, string> = {
  daily_counts: "Conteo diario",
  export: "Descarga CSV/Excel",
  wifi_sync: "Sincronización WiFi",
  gps_tracking: "Mapa GPS y paradas",
  hourly_dashboard: "Dashboard por hora",
  route_dashboard: "Dashboard por ruta",
  comparisons: "Comparativas",
  alerts: "Alertas",
  driver_exclusion: "Exclusión del conductor",
  sim_4g: "SIM 4G (próximamente)",
  fleet_view: "Vista multi-bus (flota)",
  multi_user: "Múltiples usuarios",
  device_status: "Estado de equipos",
  priority_support: "Soporte prioritario",
  max_users: "Máximo de usuarios",
};

export const BOOLEAN_FEATURES = (Object.keys(FEATURE_LABELS) as (keyof PlanFeatures)[]).filter(
  (k) => k !== "max_users",
);

/** Plan mínimo que incluye cada función (para el aviso "Disponible en plan …"). */
export const FEATURE_MIN_PLAN: Partial<Record<keyof PlanFeatures, PlanCode>> = {
  hourly_dashboard: "pro",
  route_dashboard: "pro",
  comparisons: "pro",
  alerts: "pro",
  driver_exclusion: "pro",
  fleet_view: "fleet",
  multi_user: "fleet",
  device_status: "fleet",
};

export const PLAN_NAMES: Record<PlanCode, string> = { basic: "Básico", pro: "Pro", fleet: "Flota" };

export function hasFeature(features: PlanFeatures | null | undefined, key: keyof PlanFeatures) {
  return Boolean(features?.[key]);
}

export function upgradeLabel(key: keyof PlanFeatures) {
  const plan = FEATURE_MIN_PLAN[key];
  return plan ? `Disponible en plan ${PLAN_NAMES[plan]}` : "No incluido en tu plan";
}

/** Funciones por defecto (las mismas del seed); el admin puede editarlas. */
export const DEFAULT_PLANS: {
  code: PlanCode;
  name: string;
  monthly_price_usd: number;
  features: PlanFeatures;
}[] = [
  {
    code: "basic",
    name: "Básico",
    monthly_price_usd: 15,
    features: {
      daily_counts: true,
      export: true,
      wifi_sync: true,
      gps_tracking: true,
      max_users: 1,
    },
  },
  {
    code: "pro",
    name: "Pro",
    monthly_price_usd: 25,
    features: {
      daily_counts: true,
      export: true,
      wifi_sync: true,
      gps_tracking: true,
      hourly_dashboard: true,
      route_dashboard: true,
      comparisons: true,
      alerts: true,
      driver_exclusion: true,
      sim_4g: true,
      max_users: 3,
    },
  },
  {
    code: "fleet",
    name: "Flota",
    monthly_price_usd: 35,
    features: {
      daily_counts: true,
      export: true,
      wifi_sync: true,
      gps_tracking: true,
      hourly_dashboard: true,
      route_dashboard: true,
      comparisons: true,
      alerts: true,
      driver_exclusion: true,
      sim_4g: true,
      fleet_view: true,
      multi_user: true,
      device_status: true,
      priority_support: true,
      max_users: 50,
    },
  },
];

export function planHighlights(features: PlanFeatures): string[] {
  const out = BOOLEAN_FEATURES.filter((k) => features[k]).map((k) => FEATURE_LABELS[k]);
  if (features.max_users)
    out.push(features.max_users === 1 ? "1 usuario" : `Hasta ${features.max_users} usuarios`);
  return out;
}

/** Planes para la landing (lectura pública con anon key; con respaldo local). */
export async function getPublicPlans() {
  let rows: { code: PlanCode; name: string; monthly_price_usd: number; features: PlanFeatures }[] =
    DEFAULT_PLANS;
  if (isSupabaseConfigured()) {
    try {
      const res = await fetch(
        `${env.supabaseUrl}/rest/v1/plans?select=code,name,monthly_price_usd,features&is_active=eq.true&order=monthly_price_usd`,
        { headers: { apikey: env.supabaseAnonKey }, next: { revalidate: 3600 } },
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length) rows = data;
      }
    } catch {
      // sin conexión: se usan los planes por defecto
    }
  }
  return rows.map((p) => ({
    ...p,
    monthly_price_usd: Number(p.monthly_price_usd),
    highlights: planHighlights(p.features),
  }));
}
