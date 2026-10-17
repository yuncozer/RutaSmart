/** Acceso centralizado a variables de entorno. */
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "RutaSmart RU7",
};

export const isSupabaseConfigured = () => Boolean(env.supabaseUrl && env.supabaseAnonKey);

/** Solo servidor: nunca importar desde componentes de cliente. */
export function serverEnv() {
  return {
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    cronSecret: process.env.CRON_SECRET ?? "",
    deviceRateLimitPerMin: Number(process.env.DEVICE_RATE_LIMIT_PER_MIN ?? 60),
  };
}
