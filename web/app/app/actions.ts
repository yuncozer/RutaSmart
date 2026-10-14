"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ORG_COOKIE, requireAppContext, requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";
import { inviteMember } from "@/lib/members";
import type { ActionState } from "@/components/action-form";

const uuid = z.string().uuid();

export async function switchOrganization(orgId: string) {
  const ctx = await requireAppContext();
  if (!ctx.memberships.some((m) => m.organization_id === orgId)) return;
  (await cookies()).set(ORG_COOKIE, orgId, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/app", "layout");
}

export async function markAlertRead(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireOwner();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return { error: "Alerta inválida" };
  const supabase = await createClient();
  const { error } = await supabase.from("alerts").update({ is_read: true }).eq("id", id.data);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/app");
  return { success: "ok" };
}

/** Owner invita a un conductor y le asigna buses (respeta el máximo de usuarios del plan). */
export async function inviteDriver(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireOwner();
  const parsed = z
    .object({
      email: z.string().trim().email("Correo inválido"),
      full_name: z.string().trim().min(2, "Escribe el nombre del conductor"),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const busIds = fd
    .getAll("bus_ids")
    .map(String)
    .filter((v) => uuid.safeParse(v).success);

  const supabase = await createClient();
  const { count } = await supabase
    .from("memberships")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", ctx.org.id);
  const maxUsers = ctx.access.features.max_users ?? 1;
  if ((count ?? 0) >= maxUsers) {
    return {
      error: `Tu plan permite ${maxUsers} usuario${maxUsers === 1 ? "" : "s"}. Cambia a un plan superior para agregar más.`,
    };
  }

  const res = await inviteMember({ organization_id: ctx.org.id, role: "driver", ...parsed.data });
  if (res.error || !res.userId) return { error: res.error };

  if (busIds.length) {
    const { error } = await supabase.from("driver_buses").upsert(
      busIds.map((bus_id) => ({ driver_user_id: res.userId!, bus_id })),
      { ignoreDuplicates: true },
    );
    if (error) return { error: dbErrorMessage(error) };
  }
  revalidatePath("/app/usuarios");
  return { success: res.success };
}

export async function updateDriverBuses(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireOwner();
  const userId = uuid.safeParse(fd.get("user_id"));
  if (!userId.success) return { error: "Conductor inválido" };
  const busIds = fd
    .getAll("bus_ids")
    .map(String)
    .filter((v) => uuid.safeParse(v).success);

  const supabase = await createClient();
  const { data: orgBuses } = await supabase
    .from("buses")
    .select("id")
    .eq("organization_id", ctx.org.id);
  const orgBusIds = (orgBuses ?? []).map((b) => b.id);

  const del = await supabase
    .from("driver_buses")
    .delete()
    .eq("driver_user_id", userId.data)
    .in("bus_id", orgBusIds);
  if (del.error) return { error: dbErrorMessage(del.error) };
  const selected = busIds.filter((id) => orgBusIds.includes(id));
  if (selected.length) {
    const ins = await supabase
      .from("driver_buses")
      .insert(selected.map((bus_id) => ({ driver_user_id: userId.data, bus_id })));
    if (ins.error) return { error: dbErrorMessage(ins.error) };
  }
  revalidatePath("/app/usuarios");
  return { success: "Buses asignados actualizados." };
}

export async function removeDriver(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireOwner();
  const userId = uuid.safeParse(fd.get("user_id"));
  if (!userId.success) return { error: "Conductor inválido" };
  const supabase = await createClient();
  const { data: orgBuses } = await supabase
    .from("buses")
    .select("id")
    .eq("organization_id", ctx.org.id);
  await supabase
    .from("driver_buses")
    .delete()
    .eq("driver_user_id", userId.data)
    .in(
      "bus_id",
      (orgBuses ?? []).map((b) => b.id),
    );
  const { error } = await supabase
    .from("memberships")
    .delete()
    .eq("organization_id", ctx.org.id)
    .eq("user_id", userId.data)
    .eq("role", "driver");
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/app/usuarios");
  return { success: "Conductor removido." };
}
