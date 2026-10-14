import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  MemberRole,
  Organization,
  PlanCode,
  PlanFeatures,
  SubscriptionStatus,
} from "@/lib/types";

export const ORG_COOKIE = "rs_org";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  is_superadmin: boolean;
}

export interface OrgAccess {
  status: SubscriptionStatus;
  plan_code: PlanCode | null;
  plan_name?: string;
  features: PlanFeatures;
  bus_quantity?: number;
  modality?: "purchase" | "rental";
  trial_ends_at?: string | null;
  current_period_end?: string | null;
  grace_days?: number;
}

export interface AppContext {
  userId: string;
  email: string;
  profile: Profile;
  role: MemberRole;
  org: Organization;
  memberships: { organization_id: string; role: MemberRole; organization: Organization }[];
  access: OrgAccess;
}

/** Usuario autenticado (validado contra Supabase Auth) o null. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, phone, is_superadmin")
    .eq("id", user.id)
    .maybeSingle();
  return data as Profile | null;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** Protege páginas y acciones del panel admin. */
export async function requireSuperadmin() {
  const user = await requireUser();
  const profile = await getProfile();
  if (!profile?.is_superadmin) redirect("/app");
  return { user, profile };
}

/**
 * Contexto del portal cliente: organización activa, rol, plan y estado de suscripción.
 * Si el usuario pertenece a varias organizaciones, se usa la elegida en la cookie rs_org.
 */
export const getAppContext = cache(async (): Promise<AppContext | null> => {
  const user = await getUser();
  if (!user) return null;
  const profile = await getProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("memberships")
    .select("organization_id, role, organization:organizations(*)")
    .eq("user_id", user.id)
    .order("created_at");

  const memberships = (rows ?? []) as unknown as AppContext["memberships"];
  if (!memberships.length) return null;

  const cookieStore = await cookies();
  const preferred = cookieStore.get(ORG_COOKIE)?.value;
  const current = memberships.find((m) => m.organization_id === preferred) ?? memberships[0];

  const { data: access } = await supabase.rpc("get_org_access", {
    p_org_id: current.organization_id,
  });

  return {
    userId: user.id,
    email: user.email ?? "",
    profile,
    role: current.role,
    org: current.organization,
    memberships,
    access: (access as OrgAccess) ?? { status: "none", plan_code: null, features: {} },
  };
});

export async function requireAppContext() {
  const user = await requireUser();
  const ctx = await getAppContext();
  if (!ctx) {
    const profile = await getProfile();
    if (profile?.is_superadmin) redirect("/admin");
    redirect(`/sin-acceso?u=${encodeURIComponent(user.email ?? "")}`);
  }
  return ctx;
}

export async function requireOwner() {
  const ctx = await requireAppContext();
  if (ctx.role !== "owner") redirect("/app");
  return ctx;
}
