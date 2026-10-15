import type { User } from "@supabase/supabase-js";

/** Ruta donde el usuario crea / cambia su contraseña. */
export const CHANGE_PASSWORD_PATH = "/actualizar-clave";

/**
 * Marca en app_metadata (solo la puede escribir el servidor con service role)
 * para las cuentas creadas con contraseña temporal.
 */
export const MUST_CHANGE_PASSWORD_FLAG = "must_change_password";

export function mustChangePassword(user: Pick<User, "app_metadata"> | null | undefined) {
  return Boolean(user?.app_metadata?.[MUST_CHANGE_PASSWORD_FLAG]);
}

/** Rutas permitidas mientras la contraseña temporal no se haya cambiado. */
export function isAllowedWhilePasswordPending(path: string) {
  return (
    path === CHANGE_PASSWORD_PATH ||
    path.startsWith("/auth/") ||
    path.startsWith("/api/") ||
    path.startsWith("/_next/")
  );
}
