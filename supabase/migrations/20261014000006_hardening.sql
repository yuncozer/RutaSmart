-- =============================================================
-- RutaSmart · Endurecimiento (recomendaciones del asesor de seguridad de Supabase)
-- =============================================================

-- search_path fijo
alter function public.set_updated_at() set search_path = '';
alter function public.subscription_status_of(text, timestamptz, timestamptz, integer, timestamptz)
  set search_path = '';

-- Funciones internas: no deben poder llamarse por /rest/v1/rpc
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.enforce_bus_limit() from public, anon, authenticated;
revoke execute on function public.current_subscription_id(uuid) from public, anon, authenticated;
revoke execute on function public.assert_dashboard_access(uuid) from public, anon, authenticated;
