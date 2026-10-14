"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSuperadmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dbErrorMessage, emptyToNull } from "@/lib/errors";
import { addMonths, computeSubscriptionStatus } from "@/lib/subscription";
import { BOOLEAN_FEATURES } from "@/lib/plans";
import { inviteMember } from "@/lib/members";
import type { ActionState } from "@/components/action-form";

const uuid = z.string().uuid();
const TZ_BY_COUNTRY = { VE: "America/Caracas", CO: "America/Bogota" } as const;

function firstIssue(err: z.ZodError) {
  return { error: err.issues[0]?.message ?? "Datos inválidos" };
}

// ---------------------------------------------------------------------------
// Organizaciones
// ---------------------------------------------------------------------------
const orgSchema = z.object({
  name: z.string().trim().min(2, "Nombre muy corto"),
  tax_id: z.string().trim().optional(),
  country: z.enum(["VE", "CO"]),
  contact_phone: z.string().trim().optional(),
  contact_email: z.union([z.literal(""), z.string().trim().email("Correo inválido")]).optional(),
});

function orgPayload(fd: FormData) {
  const parsed = orgSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstIssue(parsed.error) } as const;
  const d = parsed.data;
  return {
    data: {
      name: d.name,
      tax_id: emptyToNull(d.tax_id ?? null),
      country: d.country,
      timezone: TZ_BY_COUNTRY[d.country],
      contact_phone: emptyToNull(d.contact_phone ?? null),
      contact_email: emptyToNull(d.contact_email ?? null),
    },
  } as const;
}

export async function createOrganization(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperadmin();
  const p = orgPayload(fd);
  if ("error" in p) return p.error;
  const supabase = await createClient();
  const { data, error } = await supabase.from("organizations").insert(p.data).select("id").single();
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/admin/organizaciones");
  redirect(`/admin/organizaciones/${data.id}`);
}

export async function updateOrganization(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperadmin();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return { error: "Organización inválida" };
  const p = orgPayload(fd);
  if ("error" in p) return p.error;
  const supabase = await createClient();
  const { error } = await supabase.from("organizations").update(p.data).eq("id", id.data);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath(`/admin/organizaciones/${id.data}`);
  return { success: "Organización actualizada." };
}

// ---------------------------------------------------------------------------
// Usuarios de una organización
// ---------------------------------------------------------------------------
const inviteSchema = z.object({
  organization_id: uuid,
  email: z.string().trim().email("Correo inválido"),
  full_name: z.string().trim().optional(),
  role: z.enum(["owner", "driver"]),
});

export async function inviteOrgUser(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperadmin();
  const parsed = inviteSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return firstIssue(parsed.error);
  const res = await inviteMember(parsed.data);
  if (res.error) return res;
  revalidatePath(`/admin/organizaciones/${parsed.data.organization_id}`);
  return res;
}

export async function removeOrgUser(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperadmin();
  const org = uuid.safeParse(fd.get("organization_id"));
  const user = uuid.safeParse(fd.get("user_id"));
  if (!org.success || !user.success) return { error: "Datos inválidos" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("memberships")
    .delete()
    .eq("organization_id", org.data)
    .eq("user_id", user.data);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath(`/admin/organizaciones/${org.data}`);
  return { success: "Usuario removido." };
}

// ---------------------------------------------------------------------------
// Buses
// ---------------------------------------------------------------------------
const busSchema = z.object({
  organization_id: uuid,
  plate: z
    .string()
    .trim()
    .min(3, "Placa inválida")
    .transform((s) => s.toUpperCase()),
  alias: z.string().trim().optional(),
  route_name: z.string().trim().optional(),
});

export async function createBus(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperadmin();
  const parsed = busSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return firstIssue(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("buses").insert({
    organization_id: parsed.data.organization_id,
    plate: parsed.data.plate,
    alias: emptyToNull(parsed.data.alias ?? null),
    route_name: emptyToNull(parsed.data.route_name ?? null),
  });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/admin/buses");
  revalidatePath(`/admin/organizaciones/${parsed.data.organization_id}`);
  return { success: "Bus registrado." };
}

export async function updateBus(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperadmin();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return { error: "Bus inválido" };
  const supabase = await createClient();
  const update: Record<string, unknown> = {};
  if (fd.has("is_active")) update.is_active = fd.get("is_active") === "true";
  if (fd.has("plate")) update.plate = String(fd.get("plate")).trim().toUpperCase();
  if (fd.has("alias")) update.alias = emptyToNull(fd.get("alias"));
  if (fd.has("route_name")) update.route_name = emptyToNull(fd.get("route_name"));
  const { error } = await supabase.from("buses").update(update).eq("id", id.data);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/admin/buses");
  revalidatePath("/admin/organizaciones", "layout");
  return { success: "Bus actualizado." };
}

// ---------------------------------------------------------------------------
// Dispositivos
// ---------------------------------------------------------------------------
export type DeviceSecretState = { error?: string; serial?: string; secret?: string } | undefined;

export async function registerDevice(
  _: DeviceSecretState,
  fd: FormData,
): Promise<DeviceSecretState> {
  await requireSuperadmin();
  const modality = z.enum(["purchase", "rental", ""]).safeParse(fd.get("modality") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("register_device", {
      p_modality: modality.success && modality.data ? modality.data : null,
    })
    .single<{ id: string; serial: string; secret: string }>();
  if (error || !data) return { error: dbErrorMessage(error) };
  revalidatePath("/admin/dispositivos");
  return { serial: data.serial, secret: data.secret };
}

export async function rotateDeviceSecret(
  _: DeviceSecretState,
  fd: FormData,
): Promise<DeviceSecretState> {
  await requireSuperadmin();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return { error: "Dispositivo inválido" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rotate_device_secret", { p_device_id: id.data });
  if (error) return { error: dbErrorMessage(error) };
  return { serial: String(fd.get("serial") ?? ""), secret: data as string };
}

export async function assignDevice(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperadmin();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return { error: "Dispositivo inválido" };
  const busId = emptyToNull(fd.get("bus_id"));
  const modality = emptyToNull(fd.get("modality"));
  const supabase = await createClient();

  let update: Record<string, unknown>;
  if (busId) {
    const { data: bus } = await supabase
      .from("buses")
      .select("id, organization_id")
      .eq("id", busId)
      .single();
    if (!bus) return { error: "Bus no encontrado" };
    update = { bus_id: bus.id, organization_id: bus.organization_id, status: "active" };
  } else {
    update = { bus_id: null, organization_id: null, status: "inventory" };
  }
  if (modality === "purchase" || modality === "rental") update.modality = modality;

  const { data: current } = await supabase
    .from("devices")
    .select("status")
    .eq("id", id.data)
    .single();
  if (current?.status === "retired") return { error: "El dispositivo está retirado." };
  if (current?.status === "disabled" && busId) update.status = "disabled"; // no reactivar implícitamente

  const { error } = await supabase.from("devices").update(update).eq("id", id.data);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/admin/dispositivos");
  return { success: busId ? "Dispositivo asignado." : "Dispositivo devuelto a inventario." };
}

export async function setDeviceStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperadmin();
  const id = uuid.safeParse(fd.get("id"));
  const status = z.enum(["active", "disabled", "retired"]).safeParse(fd.get("status"));
  if (!id.success || !status.success) return { error: "Datos inválidos" };
  const supabase = await createClient();
  const update: Record<string, unknown> = { status: status.data };
  if (status.data === "retired") Object.assign(update, { bus_id: null, organization_id: null });
  if (status.data === "active") {
    const { data: d } = await supabase.from("devices").select("bus_id").eq("id", id.data).single();
    if (!d?.bus_id) update.status = "inventory";
  }
  const { error } = await supabase.from("devices").update(update).eq("id", id.data);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/admin/dispositivos");
  return { success: "Estado actualizado." };
}

// ---------------------------------------------------------------------------
// Planes
// ---------------------------------------------------------------------------
export async function updatePlan(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperadmin();
  const parsed = z
    .object({
      id: uuid,
      name: z.string().trim().min(2),
      monthly_price_usd: z.coerce.number().min(0, "Precio inválido"),
      max_users: z.coerce.number().int().min(1, "Mínimo 1 usuario"),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return firstIssue(parsed.error);

  const features: Record<string, boolean | number> = { max_users: parsed.data.max_users };
  for (const key of BOOLEAN_FEATURES) features[key] = fd.get(`f_${key}`) === "on";

  const supabase = await createClient();
  const { error } = await supabase
    .from("plans")
    .update({
      name: parsed.data.name,
      monthly_price_usd: parsed.data.monthly_price_usd,
      is_active: fd.get("is_active") === "on",
      features,
    })
    .eq("id", parsed.data.id);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/admin/planes");
  revalidatePath("/");
  return { success: "Plan actualizado." };
}

// ---------------------------------------------------------------------------
// Suscripciones
// ---------------------------------------------------------------------------
const subSchema = z.object({
  plan_id: uuid,
  bus_quantity: z.coerce.number().int().min(1, "Mínimo 1 bus"),
  billing_cycle: z.enum(["monthly", "annual"]),
  grace_days: z.coerce.number().int().min(0).max(60),
  fleet_discount_pct: z.coerce.number().min(0).max(100),
  annual_free_months: z.coerce.number().int().min(0).max(11),
  deposit_usd: z.union([z.literal(""), z.coerce.number().min(0)]).optional(),
  min_contract_months: z.union([z.literal(""), z.coerce.number().int().min(0)]).optional(),
  notes: z.string().optional(),
});

function optionalNumber(v: unknown) {
  return v === "" || v === undefined ? null : Number(v);
}

export async function createSubscription(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperadmin();
  const parsed = subSchema
    .extend({
      organization_id: uuid,
      modality: z.enum(["purchase", "rental"]),
      started_at: z.string().date("Fecha de inicio inválida"),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return firstIssue(parsed.error);
  const d = parsed.data;

  const start = new Date(`${d.started_at}T12:00:00Z`);
  // Compra: 3 meses gratis. Alquiler: paga desde el día 1 (registrar el primer pago).
  const trialEnds = d.modality === "purchase" ? addMonths(start, 3) : null;
  const periodEnd = trialEnds ?? start;
  const status = computeSubscriptionStatus({
    status: "active",
    trial_ends_at: trialEnds?.toISOString() ?? null,
    current_period_end: periodEnd.toISOString(),
    grace_days: d.grace_days,
  });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      organization_id: d.organization_id,
      plan_id: d.plan_id,
      bus_quantity: d.bus_quantity,
      modality: d.modality,
      billing_cycle: d.billing_cycle,
      started_at: start.toISOString(),
      trial_ends_at: trialEnds?.toISOString() ?? null,
      current_period_end: periodEnd.toISOString(),
      grace_days: d.grace_days,
      status: status === "none" ? "active" : status,
      fleet_discount_pct: d.fleet_discount_pct,
      annual_free_months: d.annual_free_months,
      deposit_usd: optionalNumber(d.deposit_usd),
      min_contract_months: optionalNumber(d.min_contract_months),
      notes: emptyToNull(d.notes ?? null),
    })
    .select("id")
    .single();
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/admin/suscripciones");
  redirect(`/admin/suscripciones/${data.id}`);
}

export async function updateSubscription(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperadmin();
  const parsed = subSchema
    .extend({
      id: uuid,
      modality: z.enum(["purchase", "rental"]),
      current_period_end: z.string().date("Fecha inválida"),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return firstIssue(parsed.error);
  const d = parsed.data;

  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, trial_ends_at, organization_id")
    .eq("id", d.id)
    .single();
  if (!sub) return { error: "Suscripción no encontrada" };

  const { count } = await supabase
    .from("buses")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", sub.organization_id)
    .eq("is_active", true);
  if ((count ?? 0) > d.bus_quantity) {
    return {
      error: `La organización tiene ${count} buses activos. Desactiva buses antes de reducir la cantidad a ${d.bus_quantity}.`,
    };
  }

  const periodEnd = new Date(`${d.current_period_end}T23:59:59Z`).toISOString();
  const status = computeSubscriptionStatus({
    status: sub.status,
    trial_ends_at: sub.trial_ends_at,
    current_period_end: periodEnd,
    grace_days: d.grace_days,
  });

  const { error } = await supabase
    .from("subscriptions")
    .update({
      plan_id: d.plan_id,
      bus_quantity: d.bus_quantity,
      modality: d.modality,
      billing_cycle: d.billing_cycle,
      grace_days: d.grace_days,
      current_period_end: periodEnd,
      status: status === "none" ? "expired" : status,
      fleet_discount_pct: d.fleet_discount_pct,
      annual_free_months: d.annual_free_months,
      deposit_usd: optionalNumber(d.deposit_usd),
      min_contract_months: optionalNumber(d.min_contract_months),
      notes: emptyToNull(d.notes ?? null),
    })
    .eq("id", d.id);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath(`/admin/suscripciones/${d.id}`);
  revalidatePath("/admin/suscripciones");
  return { success: "Suscripción actualizada." };
}

export async function setSubscriptionCanceled(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperadmin();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return { error: "Suscripción inválida" };
  const cancel = fd.get("cancel") === "true";
  const supabase = await createClient();
  const { data: sub } = await supabase.from("subscriptions").select("*").eq("id", id.data).single();
  if (!sub) return { error: "Suscripción no encontrada" };
  const status = cancel ? "canceled" : computeSubscriptionStatus({ ...sub, status: "active" });
  const { error } = await supabase.from("subscriptions").update({ status }).eq("id", id.data);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath(`/admin/suscripciones/${id.data}`);
  revalidatePath("/admin/suscripciones");
  return { success: cancel ? "Suscripción cancelada." : "Suscripción reactivada." };
}

// ---------------------------------------------------------------------------
// Pagos (registro manual → extiende el período)
// ---------------------------------------------------------------------------
export async function registerPayment(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperadmin();
  const parsed = z
    .object({
      subscription_id: uuid,
      amount_usd: z.coerce.number().positive("Monto inválido"),
      method: z.enum(["pago_movil", "zelle", "binance", "transfer", "cash", "other"]),
      period_months: z.coerce.number().int().min(1).max(24),
      reference: z.string().optional(),
      paid_at: z.string().date("Fecha inválida"),
      notes: z.string().optional(),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return firstIssue(parsed.error);
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("register_payment", {
    p_subscription_id: d.subscription_id,
    p_amount_usd: d.amount_usd,
    p_method: d.method,
    p_period_months: d.period_months,
    p_reference: emptyToNull(d.reference ?? null),
    p_paid_at: new Date(`${d.paid_at}T12:00:00Z`).toISOString(),
    p_notes: emptyToNull(d.notes ?? null),
  });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/admin/pagos");
  revalidatePath(`/admin/suscripciones/${d.subscription_id}`);
  revalidatePath("/admin/suscripciones");
  return { success: "Pago registrado. El período de la suscripción se extendió." };
}

// ---------------------------------------------------------------------------
// Firmware (OTA)
// ---------------------------------------------------------------------------
/**
 * Registra una versión de firmware. El navegador sube el binario directo a Storage
 * (evita el límite de tamaño de las Server Actions / Vercel) y aquí se verifica
 * el sha256 descargándolo con service role.
 */
export async function createFirmwareRelease(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperadmin();
  const parsed = z
    .object({
      version: z
        .string()
        .trim()
        .regex(/^\d+\.\d+\.\d+$/, "Usa el formato x.y.z (ej. 0.2.0)"),
      model_version: z.string().trim().optional(),
      release_notes: z.string().optional(),
      file_path: z.string().regex(/^\d+\.\d+\.\d+\/firmware\.bin$/, "Ruta de archivo inválida"),
      checksum_sha256: z.string().regex(/^[a-f0-9]{64}$/, "Checksum inválido"),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return firstIssue(parsed.error);
  const d = parsed.data;
  if (!d.file_path.startsWith(`${d.version}/`))
    return { error: "La ruta no coincide con la versión" };

  const admin = createAdminClient();
  const download = await admin.storage.from("firmware").download(d.file_path);
  if (download.error || !download.data)
    return { error: "No se encontró el archivo subido en Storage." };
  const checksum = createHash("sha256")
    .update(Buffer.from(await download.data.arrayBuffer()))
    .digest("hex");
  if (checksum !== d.checksum_sha256) {
    await admin.storage.from("firmware").remove([d.file_path]);
    return {
      error: "El checksum no coincide: el archivo se corrompió al subir. Intenta de nuevo.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("firmware_releases").insert({
    version: d.version,
    model_version: emptyToNull(d.model_version ?? null),
    release_notes: emptyToNull(d.release_notes ?? null),
    file_path: d.file_path,
    checksum_sha256: checksum,
  });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/admin/firmware");
  return {
    success: `Versión ${d.version} registrada (sha256 ${checksum.slice(0, 12)}…). Márcala como estable para publicarla.`,
  };
}

export async function setFirmwareStable(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperadmin();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return { error: "Versión inválida" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("firmware_releases")
    .update({ is_stable: fd.get("stable") === "true" })
    .eq("id", id.data);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/admin/firmware");
  return { success: "Actualizado." };
}
