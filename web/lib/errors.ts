/** Traduce errores de Postgres / Supabase a mensajes en español para la UI. */
export function dbErrorMessage(
  error: { code?: string; message?: string; details?: string } | null | undefined,
) {
  if (!error) return "Ocurrió un error inesperado.";
  const msg = error.message ?? "";
  if (msg.includes("bus_limit_exceeded")) {
    return `Se alcanzó el límite de buses de la suscripción. ${error.details ?? ""} Aumenta la cantidad de buses del plan para registrar más.`.trim();
  }
  if (msg.includes("subscription_expired")) return "La suscripción está vencida.";
  if (msg.includes("subscriptions_one_active_per_org")) {
    return "La organización ya tiene una suscripción activa. Edita la existente o cancélala primero.";
  }
  if (msg.includes("devices_bus_unique")) return "Ese bus ya tiene un dispositivo asignado.";
  switch (error.code) {
    case "23505":
      return "Ya existe un registro con esos datos (valor duplicado).";
    case "23503":
      return "No se puede completar: hay registros relacionados.";
    case "23514":
      return "Algún valor no es válido.";
    case "42501":
      return "No tienes permiso para esta acción.";
    case "P0002":
      return "No encontrado.";
  }
  return "No se pudo guardar. Intenta de nuevo.";
}

/** Convierte "" en null para campos opcionales de formularios. */
export function emptyToNull(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}
