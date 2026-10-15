"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CHANGE_PASSWORD_PATH,
  MUST_CHANGE_PASSWORD_FLAG,
  mustChangePassword,
} from "@/lib/password-policy";

export type FormState = { error?: string; success?: string } | undefined;

const loginSchema = z.object({
  email: z.string().trim().email("Correo inválido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
  next: z.string().optional(),
});

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

/** Solo permite redirecciones internas (evita open redirects). */
function safeNext(next?: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error || !data.user) return { error: "Correo o contraseña incorrectos." };

  // Cuenta con contraseña temporal: primero debe crear la suya
  if (mustChangePassword(data.user)) redirect(CHANGE_PASSWORD_PATH);

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", data.user.id)
    .maybeSingle();

  redirect(safeNext(parsed.data.next) ?? (profile?.is_superadmin ? "/admin" : "/app"));
}

export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = z.string().trim().email().safeParse(formData.get("email"));
  if (!email.success) return { error: "Correo inválido" };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${await siteUrl()}/auth/callback?next=/actualizar-clave`,
  });
  // Mismo mensaje exista o no la cuenta (no revelar usuarios)
  return {
    success: "Si el correo está registrado, recibirás un enlace para crear una nueva contraseña.",
  };
}

const passwordSchema = z
  .object({
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Las contraseñas no coinciden" });

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      error:
        error.code === "same_password"
          ? "La nueva contraseña debe ser distinta de la actual."
          : "No se pudo actualizar la contraseña. Intenta de nuevo o solicita un nuevo enlace.",
    };
  }

  // Quita la marca de contraseña temporal (app_metadata solo se escribe con service role)
  if (mustChangePassword(user)) {
    const admin = createAdminClient();
    const { error: metaError } = await admin.auth.admin.updateUserById(user.id, {
      app_metadata: { [MUST_CHANGE_PASSWORD_FLAG]: false },
    });
    if (metaError)
      return {
        error: "La contraseña se cambió, pero no se pudo completar el registro. Intenta de nuevo.",
      };
    // Refresca el token para que la sesión ya no lleve la marca
    await supabase.auth.refreshSession();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .maybeSingle();
  redirect(profile?.is_superadmin ? "/admin" : "/app");
}
