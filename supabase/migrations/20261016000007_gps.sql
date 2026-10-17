-- =============================================================
-- RutaSmart RU7 · Módulo GPS
--   - device_positions: recorrido del bus (puntos GPS enviados por el equipo)
--   - Funciones para el mapa: posición en vivo de la flota, recorrido del día,
--     puntos de subida/bajada y paradas con más movimiento
--   - Función de plan gps_tracking (activa en todos los planes)
-- =============================================================

-- -------------------------------------------------------------
-- Posiciones GPS (id generado por el dispositivo → idempotencia)
-- -------------------------------------------------------------
create table public.device_positions (
  id uuid primary key,
  device_id uuid not null references public.devices (id) on delete cascade,
  bus_id uuid not null references public.buses (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  recorded_at timestamptz not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  speed_kmh real check (speed_kmh is null or speed_kmh between 0 and 250),
  heading smallint check (heading is null or heading between 0 and 359),
  accuracy_m real check (accuracy_m is null or accuracy_m >= 0),
  satellites smallint check (satellites is null or satellites >= 0),
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index device_positions_bus_time_idx on public.device_positions (bus_id, recorded_at);
create index device_positions_org_time_idx on public.device_positions (organization_id, recorded_at);

create trigger set_updated_at before update on public.device_positions
  for each row execute function public.set_updated_at();

-- Índice parcial para puntos de subida/bajada con ubicación
create index count_events_bus_time_geo_idx on public.count_events (bus_id, occurred_at)
  where lat is not null and lng is not null;

-- -------------------------------------------------------------
-- RLS: lectura igual que count_events; escritura solo servidor
-- -------------------------------------------------------------
alter table public.device_positions enable row level security;

create policy "device_positions_select" on public.device_positions for select to authenticated
  using (
    public.is_superadmin()
    or organization_id in (select public.user_owner_org_ids())
    or bus_id in (select public.driver_bus_ids())
  );

revoke all on public.device_positions from anon;
revoke insert, update, delete on public.device_positions from authenticated;

-- -------------------------------------------------------------
-- Función de plan: GPS en todos los planes (el admin puede cambiarlo)
-- -------------------------------------------------------------
update public.plans set features = features || '{"gps_tracking": true}'::jsonb
where code in ('basic', 'pro', 'fleet');

-- -------------------------------------------------------------
-- Mapa en vivo: última posición conocida de cada bus visible
-- (usa el último punto GPS; si no hay, la última posición del heartbeat)
-- -------------------------------------------------------------
create or replace function public.fleet_positions(p_org_id uuid)
returns table (
  bus_id uuid,
  plate text,
  alias text,
  route_name text,
  device_serial text,
  device_status text,
  last_seen_at timestamptz,
  lat double precision,
  lng double precision,
  speed_kmh real,
  heading smallint,
  position_at timestamptz,
  ins_today bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz text;
  v_full boolean;
begin
  perform public.assert_dashboard_access(p_org_id);
  select o.timezone into v_tz from public.organizations o where o.id = p_org_id;
  v_full := public.is_superadmin() or public.is_org_owner(p_org_id);

  return query
  select
    b.id,
    b.plate,
    b.alias,
    b.route_name,
    d.serial,
    d.status,
    d.last_seen_at,
    coalesce(p.lat, d.last_lat),
    coalesce(p.lng, d.last_lng),
    p.speed_kmh,
    p.heading,
    coalesce(p.recorded_at, case when d.last_lat is not null then d.last_seen_at end),
    (
      select count(*) from public.count_events e
      where e.bus_id = b.id
        and e.direction = 'in' and not e.is_driver
        and e.occurred_at >= ((now() at time zone v_tz)::date)::timestamp at time zone v_tz
    )
  from public.buses b
  left join public.devices d on d.bus_id = b.id
  left join lateral (
    select dp.lat, dp.lng, dp.speed_kmh, dp.heading, dp.recorded_at
    from public.device_positions dp
    where dp.bus_id = b.id
    order by dp.recorded_at desc
    limit 1
  ) p on true
  where b.organization_id = p_org_id
    and b.is_active
    and (v_full or b.id in (select public.driver_bus_ids()))
  order by b.plate;
end;
$$;

-- -------------------------------------------------------------
-- Recorrido del bus en un día (zona horaria de la organización)
-- -------------------------------------------------------------
create or replace function public.bus_route(p_bus_id uuid, p_date date)
returns table (recorded_at timestamptz, lat double precision, lng double precision, speed_kmh real)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_tz text;
begin
  select b.organization_id, o.timezone into v_org, v_tz
  from public.buses b join public.organizations o on o.id = b.organization_id
  where b.id = p_bus_id;
  if v_org is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  perform public.assert_dashboard_access(v_org);
  if not (public.is_superadmin() or public.is_org_owner(v_org)
          or p_bus_id in (select public.driver_bus_ids())) then
    raise exception 'access_denied' using errcode = '42501';
  end if;

  return query
  select dp.recorded_at, dp.lat, dp.lng, dp.speed_kmh
  from public.device_positions dp
  where dp.bus_id = p_bus_id
    and dp.recorded_at >= (p_date::timestamp at time zone v_tz)
    and dp.recorded_at < ((p_date + 1)::timestamp at time zone v_tz)
  order by dp.recorded_at
  limit 5000;
end;
$$;

-- -------------------------------------------------------------
-- Subidas y bajadas con ubicación de un bus en un día
-- -------------------------------------------------------------
create or replace function public.boarding_points(p_bus_id uuid, p_date date)
returns table (occurred_at timestamptz, direction text, lat double precision, lng double precision)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_tz text;
begin
  select b.organization_id, o.timezone into v_org, v_tz
  from public.buses b join public.organizations o on o.id = b.organization_id
  where b.id = p_bus_id;
  if v_org is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  perform public.assert_dashboard_access(v_org);
  if not (public.is_superadmin() or public.is_org_owner(v_org)
          or p_bus_id in (select public.driver_bus_ids())) then
    raise exception 'access_denied' using errcode = '42501';
  end if;

  return query
  select e.occurred_at, e.direction, e.lat, e.lng
  from public.count_events e
  where e.bus_id = p_bus_id
    and not e.is_driver
    and e.lat is not null and e.lng is not null
    and e.occurred_at >= (p_date::timestamp at time zone v_tz)
    and e.occurred_at < ((p_date + 1)::timestamp at time zone v_tz)
  order by e.occurred_at
  limit 10000;
end;
$$;

-- -------------------------------------------------------------
-- Paradas con más movimiento: agrupa subidas/bajadas en celdas de ~110 m
-- (lat/lng redondeados a 3 decimales) dentro de un rango de fechas
-- -------------------------------------------------------------
create or replace function public.stop_hotspots(
  p_org_id uuid,
  p_from date,
  p_to date,
  p_bus_id uuid default null,
  p_limit integer default 25
)
returns table (lat double precision, lng double precision, ins bigint, outs bigint, total bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz text;
  v_full boolean;
begin
  perform public.assert_dashboard_access(p_org_id);
  if p_to < p_from or p_to - p_from > 92 then
    raise exception 'invalid_range' using errcode = '22023';
  end if;
  select o.timezone into v_tz from public.organizations o where o.id = p_org_id;
  v_full := public.is_superadmin() or public.is_org_owner(p_org_id);

  return query
  select
    avg(e.lat) as lat,
    avg(e.lng) as lng,
    count(*) filter (where e.direction = 'in') as ins,
    count(*) filter (where e.direction = 'out') as outs,
    count(*) as total
  from public.count_events e
  where e.organization_id = p_org_id
    and not e.is_driver
    and e.lat is not null and e.lng is not null
    and e.occurred_at >= (p_from::timestamp at time zone v_tz)
    and e.occurred_at < ((p_to + 1)::timestamp at time zone v_tz)
    and (p_bus_id is null or e.bus_id = p_bus_id)
    and (v_full or e.bus_id in (select public.driver_bus_ids()))
  group by round(e.lat::numeric, 3), round(e.lng::numeric, 3)
  order by total desc
  limit least(greatest(p_limit, 1), 200);
end;
$$;

-- -------------------------------------------------------------
-- Permisos: nada para anon
-- -------------------------------------------------------------
revoke execute on function public.fleet_positions(uuid) from public, anon;
revoke execute on function public.bus_route(uuid, date) from public, anon;
revoke execute on function public.boarding_points(uuid, date) from public, anon;
revoke execute on function public.stop_hotspots(uuid, date, date, uuid, integer) from public, anon;
grant execute on function public.fleet_positions(uuid) to authenticated, service_role;
grant execute on function public.bus_route(uuid, date) to authenticated, service_role;
grant execute on function public.boarding_points(uuid, date) to authenticated, service_role;
grant execute on function public.stop_hotspots(uuid, date, date, uuid, integer) to authenticated, service_role;
