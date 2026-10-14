-- =============================================================
-- RutaSmart · Búsqueda de usuarios por correo (solo servidor)
-- Se usa al invitar dueños / conductores que ya tienen cuenta.
-- =============================================================

create or replace function public.find_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id from auth.users u where lower(u.email) = lower(trim(p_email)) limit 1;
$$;

revoke execute on function public.find_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.find_user_id_by_email(text) to service_role;

-- Correo de los miembros visibles para el owner / superadmin (profiles no guarda el correo)
create or replace function public.org_members(p_org_id uuid)
returns table (user_id uuid, full_name text, email text, role text, bus_ids uuid[])
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.is_superadmin() or public.is_org_owner(p_org_id)) then
    raise exception 'access_denied' using errcode = '42501';
  end if;
  return query
  select m.user_id, p.full_name, u.email::text, m.role,
         coalesce(array_agg(db.bus_id) filter (where db.bus_id is not null), '{}')
  from public.memberships m
  join public.profiles p on p.id = m.user_id
  join auth.users u on u.id = m.user_id
  left join public.driver_buses db
    on db.driver_user_id = m.user_id
   and db.bus_id in (select b.id from public.buses b where b.organization_id = p_org_id)
  where m.organization_id = p_org_id
  group by m.user_id, p.full_name, u.email, m.role
  order by m.role, p.full_name;
end;
$$;

revoke execute on function public.org_members(uuid) from public, anon;
grant execute on function public.org_members(uuid) to authenticated, service_role;
