import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, serverEnv } from "@/lib/env";

let adminClient: SupabaseClient | null = null;

/**
 * Cliente con la SERVICE ROLE KEY: ignora RLS.
 * Solo para la API de dispositivos, cron y acciones de superadmin ya verificadas.
 */
export function createAdminClient(): SupabaseClient {
  if (!adminClient) {
    const { serviceRoleKey } = serverEnv();
    if (!env.supabaseUrl || !serviceRoleKey) {
      throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
    }
    adminClient = createClient(env.supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}
