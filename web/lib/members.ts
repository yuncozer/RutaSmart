import "server-only";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { dbErrorMessage } from "@/lib/errors";

/** Contraseña temporal legible (sin caracteres ambiguos). */
export function temporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(10);
  return "Rs-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/**
 * Agrega un usuario a una organización. Si no tiene cuenta, se crea con una
 * contraseña temporal que se muestra UNA vez para compartirla (p. ej. por WhatsApp).
 * Debe llamarse solo después de verificar permisos (superadmin u owner de la organización).
 */
export async function inviteMember(input: {
  organization_id: string;
  email: string;
  full_name?: string;
  role: "owner" | "driver";
}): Promise<{ error?: string; success?: string; userId?: string }> {
  const admin = createAdminClient();
  const email = input.email.toLowerCase();

  const { data: existingId, error: lookupError } = await admin.rpc("find_user_id_by_email", {
    p_email: email,
  });
  if (lookupError) return { error: dbErrorMessage(lookupError) };

  let userId = existingId as string | null;
  let tempPassword: string | null = null;

  if (!userId) {
    tempPassword = temporaryPassword();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: input.full_name || email.split("@")[0] },
    });
    if (error || !data.user)
      return { error: `No se pudo crear el usuario: ${error?.message ?? ""}` };
    userId = data.user.id;
  }

  const { error } = await admin
    .from("memberships")
    .upsert(
      { user_id: userId, organization_id: input.organization_id, role: input.role },
      { onConflict: "user_id,organization_id" },
    );
  if (error) return { error: dbErrorMessage(error) };

  const roleLabel = input.role === "owner" ? "dueño" : "conductor";
  return {
    userId,
    success: tempPassword
      ? `Usuario ${email} creado como ${roleLabel}. Contraseña temporal: ${tempPassword} (compártela; se muestra una sola vez).`
      : `${email} ya tenía cuenta y fue agregado como ${roleLabel}.`,
  };
}
