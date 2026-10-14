-- =============================================================
-- RutaSmart · Seguridad a nivel de fila (RLS)
--   superadmin → todo
--   owner      → filas de su organización
--   driver     → solo buses asignados (driver_buses) y sus conteos
--   count_events / device_heartbeats → solo escribe el servidor (service role)
-- =============================================================

-- -------------------------------------------------------------
-- Funciones auxiliares (security definer para evitar recursión de RLS)
-- -------------------------------------------------------------
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_superadmin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- Organizaciones donde el usuario es miembro (cualquier rol)
create or replace function public.user_member_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.organization_id from public.memberships m where m.user_id = auth.uid();
$$;

-- Organizaciones donde el usuario es owner
create or replace function public.user_owner_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.organization_id from public.memberships m
  where m.user_id = auth.uid() and m.role = 'owner';
$$;

-- Buses asignados al conductor actual
create or replace function public.driver_bus_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select db.bus_id
  from public.driver_buses db
  join public.buses b on b.id = db.bus_id
  join public.memberships m
    on m.user_id = db.driver_user_id and m.organization_id = b.organization_id
  where db.driver_user_id = auth.uid();
$$;

create or replace function public.is_org_owner(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid() and m.organization_id = p_org_id and m.role = 'owner'
  );
$$;

-- ¿Comparte organización el perfil dado con un owner (el usuario actual)?
create or replace function public.is_owner_of_member(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships mine
    join public.memberships theirs on theirs.organization_id = mine.organization_id
    where mine.user_id = auth.uid() and mine.role = 'owner' and theirs.user_id = p_user_id
  );
$$;

-- -------------------------------------------------------------
-- Activar RLS en todas las tablas
-- -------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.buses enable row level security;
alter table public.driver_buses enable row level security;
alter table public.devices enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.count_events enable row level security;
alter table public.device_heartbeats enable row level security;
alter table public.firmware_releases enable row level security;
alter table public.alerts enable row level security;

-- -------------------------------------------------------------
-- organizations
-- -------------------------------------------------------------
create policy "org_select" on public.organizations for select to authenticated
  using (public.is_superadmin() or id in (select public.user_member_org_ids()));
create policy "org_admin_all" on public.organizations for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());
create policy "org_owner_update" on public.organizations for update to authenticated
  using (id in (select public.user_owner_org_ids()))
  with check (id in (select public.user_owner_org_ids()));

-- -------------------------------------------------------------
-- profiles
-- -------------------------------------------------------------
create policy "profiles_select" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_superadmin() or public.is_owner_of_member(id));
create policy "profiles_update_self" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_superadmin())
  with check (id = auth.uid() or public.is_superadmin());

-- El usuario solo puede cambiar nombre y teléfono (no is_superadmin)
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- -------------------------------------------------------------
-- memberships
-- -------------------------------------------------------------
create policy "memberships_select" on public.memberships for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_superadmin()
    or organization_id in (select public.user_owner_org_ids())
  );
create policy "memberships_admin_all" on public.memberships for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());
-- El owner puede agregar / quitar conductores de su organización
create policy "memberships_owner_insert_driver" on public.memberships for insert to authenticated
  with check (role = 'driver' and organization_id in (select public.user_owner_org_ids()));
create policy "memberships_owner_delete_driver" on public.memberships for delete to authenticated
  using (role = 'driver' and organization_id in (select public.user_owner_org_ids()));

-- -------------------------------------------------------------
-- buses
-- -------------------------------------------------------------
create policy "buses_select" on public.buses for select to authenticated
  using (
    public.is_superadmin()
    or organization_id in (select public.user_owner_org_ids())
    or id in (select public.driver_bus_ids())
  );
create policy "buses_admin_all" on public.buses for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());
create policy "buses_owner_insert" on public.buses for insert to authenticated
  with check (organization_id in (select public.user_owner_org_ids()));
create policy "buses_owner_update" on public.buses for update to authenticated
  using (organization_id in (select public.user_owner_org_ids()))
  with check (organization_id in (select public.user_owner_org_ids()));

-- -------------------------------------------------------------
-- driver_buses
-- -------------------------------------------------------------
create policy "driver_buses_select" on public.driver_buses for select to authenticated
  using (
    driver_user_id = auth.uid()
    or public.is_superadmin()
    or bus_id in (
      select b.id from public.buses b
      where b.organization_id in (select public.user_owner_org_ids())
    )
  );
create policy "driver_buses_admin_all" on public.driver_buses for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());
create policy "driver_buses_owner_insert" on public.driver_buses for insert to authenticated
  with check (
    exists (
      select 1
      from public.buses b
      join public.memberships m
        on m.organization_id = b.organization_id
       and m.user_id = driver_user_id
       and m.role = 'driver'
      where b.id = bus_id and b.organization_id in (select public.user_owner_org_ids())
    )
  );
create policy "driver_buses_owner_delete" on public.driver_buses for delete to authenticated
  using (
    bus_id in (
      select b.id from public.buses b
      where b.organization_id in (select public.user_owner_org_ids())
    )
  );

-- -------------------------------------------------------------
-- devices (solo superadmin escribe; secret_hash nunca se expone)
-- -------------------------------------------------------------
create policy "devices_select" on public.devices for select to authenticated
  using (
    public.is_superadmin()
    or organization_id in (select public.user_owner_org_ids())
    or bus_id in (select public.driver_bus_ids())
  );
create policy "devices_admin_all" on public.devices for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

revoke select on public.devices from anon, authenticated;
grant select (
  id, serial, bus_id, organization_id, status, modality, firmware_version, model_version,
  last_seen_at, last_battery, last_rssi, last_lat, last_lng, created_at, updated_at
) on public.devices to authenticated;

-- -------------------------------------------------------------
-- plans (lectura pública de planes activos)
-- -------------------------------------------------------------
create policy "plans_select_anon" on public.plans for select to anon
  using (is_active);
create policy "plans_select" on public.plans for select to authenticated
  using (is_active or public.is_superadmin());
create policy "plans_admin_all" on public.plans for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

-- -------------------------------------------------------------
-- subscriptions / payments (el conductor no tiene acceso)
-- -------------------------------------------------------------
create policy "subscriptions_select" on public.subscriptions for select to authenticated
  using (public.is_superadmin() or organization_id in (select public.user_owner_org_ids()));
create policy "subscriptions_admin_all" on public.subscriptions for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

create policy "payments_select" on public.payments for select to authenticated
  using (
    public.is_superadmin()
    or subscription_id in (
      select s.id from public.subscriptions s
      where s.organization_id in (select public.user_owner_org_ids())
    )
  );
create policy "payments_admin_all" on public.payments for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

-- -------------------------------------------------------------
-- count_events (solo lectura para usuarios; inserta el servidor)
-- -------------------------------------------------------------
create policy "count_events_select" on public.count_events for select to authenticated
  using (
    public.is_superadmin()
    or organization_id in (select public.user_owner_org_ids())
    or bus_id in (select public.driver_bus_ids())
  );

-- -------------------------------------------------------------
-- device_heartbeats (solo lectura)
-- -------------------------------------------------------------
create policy "device_heartbeats_select" on public.device_heartbeats for select to authenticated
  using (
    public.is_superadmin()
    or device_id in (
      select d.id from public.devices d
      where d.organization_id in (select public.user_owner_org_ids())
    )
  );

-- -------------------------------------------------------------
-- firmware_releases (solo superadmin)
-- -------------------------------------------------------------
create policy "firmware_admin_all" on public.firmware_releases for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

-- -------------------------------------------------------------
-- alerts
-- -------------------------------------------------------------
create policy "alerts_select" on public.alerts for select to authenticated
  using (
    public.is_superadmin()
    or organization_id in (select public.user_owner_org_ids())
    or (bus_id is not null and bus_id in (select public.driver_bus_ids()))
  );
create policy "alerts_owner_update" on public.alerts for update to authenticated
  using (organization_id in (select public.user_owner_org_ids()))
  with check (organization_id in (select public.user_owner_org_ids()));
create policy "alerts_admin_all" on public.alerts for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

-- -------------------------------------------------------------
-- Escritura de datos del dispositivo: nadie excepto service role
-- -------------------------------------------------------------
revoke insert, update, delete on public.count_events from anon, authenticated;
revoke insert, update, delete on public.device_heartbeats from anon, authenticated;

-- anon solo puede leer planes (landing)
revoke all on all tables in schema public from anon;
grant select on public.plans to anon;
