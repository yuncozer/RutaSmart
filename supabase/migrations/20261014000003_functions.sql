-- =============================================================
-- RutaSmart · Funciones de negocio
--   - Estado de suscripción
--   - Funciones del dashboard (daily_counts, hourly_counts)
--   - Registro de pagos y dispositivos
--   - Límite de buses por suscripción
--   - Tareas diarias (estados y alertas)
-- =============================================================

-- -------------------------------------------------------------
-- Estado de una suscripción (misma lógica que web/lib/subscription.ts)
-- -------------------------------------------------------------
create or replace function public.subscription_status_of(
  p_status text,
  p_trial_ends_at timestamptz,
  p_current_period_end timestamptz,
  p_grace_days integer,
  p_now timestamptz default now()
)
returns text
language plpgsql
stable
as $$
declare
  v_end timestamptz;
begin
  if p_status = 'canceled' then
    return 'canceled';
  end if;
  if p_trial_ends_at is not null and p_now < p_trial_ends_at then
    return 'trialing';
  end if;
  v_end := greatest(p_trial_ends_at, p_current_period_end); -- greatest ignora nulls
  if v_end is null then
    return 'expired';
  end if;
  if p_now < v_end then
    return 'active';
  end if;
  if p_now < v_end + make_interval(days => p_grace_days) then
    return 'grace';
  end if;
  return 'expired';
end;
$$;

-- Suscripción vigente (no cancelada) de una organización, o la última cancelada
create or replace function public.current_subscription_id(p_org_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id from public.subscriptions s
  where s.organization_id = p_org_id
  order by (s.status <> 'canceled') desc, s.created_at desc
  limit 1;
$$;

-- Estado calculado en vivo: trialing | active | grace | expired | canceled | none
create or replace function public.get_subscription_status(p_org_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sub public.subscriptions;
begin
  if auth.uid() is not null
     and not public.is_superadmin()
     and p_org_id not in (select public.user_member_org_ids()) then
    raise exception 'access_denied' using errcode = '42501';
  end if;

  select * into v_sub from public.subscriptions where id = public.current_subscription_id(p_org_id);
  if not found then
    return 'none';
  end if;
  return public.subscription_status_of(
    v_sub.status, v_sub.trial_ends_at, v_sub.current_period_end, v_sub.grace_days
  );
end;
$$;

-- Acceso de la organización para la app (también para conductores, que no leen subscriptions):
-- estado, plan y funciones habilitadas. No expone montos ni pagos.
create or replace function public.get_org_access(p_org_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sub public.subscriptions;
  v_plan public.plans;
begin
  if not public.is_superadmin() and p_org_id not in (select public.user_member_org_ids()) then
    raise exception 'access_denied' using errcode = '42501';
  end if;

  select * into v_sub from public.subscriptions where id = public.current_subscription_id(p_org_id);
  if not found then
    return jsonb_build_object('status', 'none', 'plan_code', null, 'features', '{}'::jsonb);
  end if;
  select * into v_plan from public.plans where id = v_sub.plan_id;

  return jsonb_build_object(
    'status', public.subscription_status_of(v_sub.status, v_sub.trial_ends_at, v_sub.current_period_end, v_sub.grace_days),
    'plan_code', v_plan.code,
    'plan_name', v_plan.name,
    'features', v_plan.features,
    'bus_quantity', v_sub.bus_quantity,
    'modality', v_sub.modality,
    'trial_ends_at', v_sub.trial_ends_at,
    'current_period_end', v_sub.current_period_end,
    'grace_days', v_sub.grace_days
  );
end;
$$;

-- Lanza error controlado si el usuario no puede ver el dashboard de la organización
create or replace function public.assert_dashboard_access(p_org_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if public.is_superadmin() then
    return;
  end if;
  if p_org_id not in (select public.user_member_org_ids()) then
    raise exception 'access_denied' using errcode = '42501';
  end if;
  if public.get_subscription_status(p_org_id) not in ('trialing', 'active', 'grace') then
    raise exception 'subscription_expired'
      using errcode = 'P0001', hint = 'La suscripción está vencida. Registra tu pago para continuar.';
  end if;
end;
$$;

-- -------------------------------------------------------------
-- Dashboard: conteos por bus y por día (zona horaria de la organización)
-- Los cruces del conductor (is_driver) NO suman como pasajeros; se informan aparte.
-- -------------------------------------------------------------
create or replace function public.daily_counts(
  p_org_id uuid,
  p_from date,
  p_to date,
  p_bus_id uuid default null
)
returns table (bus_id uuid, day date, ins bigint, outs bigint, driver_crossings bigint)
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

  if p_to < p_from then
    raise exception 'invalid_range' using errcode = '22023';
  end if;
  if p_to - p_from > 366 then
    raise exception 'range_too_large' using errcode = '22023';
  end if;

  select o.timezone into v_tz from public.organizations o where o.id = p_org_id;
  v_full := public.is_superadmin() or public.is_org_owner(p_org_id);

  return query
  select
    e.bus_id,
    (e.occurred_at at time zone v_tz)::date as day,
    count(*) filter (where e.direction = 'in' and not e.is_driver) as ins,
    count(*) filter (where e.direction = 'out' and not e.is_driver) as outs,
    count(*) filter (where e.is_driver) as driver_crossings
  from public.count_events e
  where e.organization_id = p_org_id
    and e.occurred_at >= (p_from::timestamp at time zone v_tz)
    and e.occurred_at < ((p_to + 1)::timestamp at time zone v_tz)
    and (p_bus_id is null or e.bus_id = p_bus_id)
    and (v_full or e.bus_id in (select public.driver_bus_ids()))
  group by e.bus_id, 2
  order by 2, e.bus_id;
end;
$$;

-- Dashboard: conteos por hora de un bus en un día (0..23, incluye horas vacías)
create or replace function public.hourly_counts(p_bus_id uuid, p_date date)
returns table (hour integer, ins bigint, outs bigint, driver_crossings bigint)
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
  select
    h.h as hour,
    count(e.id) filter (where e.direction = 'in' and not e.is_driver) as ins,
    count(e.id) filter (where e.direction = 'out' and not e.is_driver) as outs,
    count(e.id) filter (where e.is_driver) as driver_crossings
  from generate_series(0, 23) as h(h)
  left join public.count_events e
    on e.bus_id = p_bus_id
   and e.occurred_at >= (p_date::timestamp at time zone v_tz)
   and e.occurred_at < ((p_date + 1)::timestamp at time zone v_tz)
   and extract(hour from e.occurred_at at time zone v_tz)::int = h.h
  group by h.h
  order by h.h;
end;
$$;

-- -------------------------------------------------------------
-- Límite de buses: no se pueden tener más buses activos que los cubiertos
-- -------------------------------------------------------------
create or replace function public.enforce_bus_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
  v_count integer;
begin
  if not new.is_active then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.is_active and old.organization_id = new.organization_id then
    return new;
  end if;

  select s.bus_quantity into v_limit
  from public.subscriptions s
  where s.id = public.current_subscription_id(new.organization_id) and s.status <> 'canceled';

  if v_limit is null then
    return new; -- sin suscripción: el admin está configurando la organización
  end if;

  select count(*) into v_count
  from public.buses b
  where b.organization_id = new.organization_id and b.is_active and b.id <> new.id;

  if v_count >= v_limit then
    raise exception 'bus_limit_exceeded'
      using errcode = 'P0001',
            detail = format('La suscripción cubre %s buses y ya hay %s activos.', v_limit, v_count);
  end if;
  return new;
end;
$$;

create trigger enforce_bus_limit
  before insert or update of is_active, organization_id on public.buses
  for each row execute function public.enforce_bus_limit();

-- -------------------------------------------------------------
-- Pagos: registrar un pago extiende current_period_end (solo superadmin)
-- -------------------------------------------------------------
create or replace function public.register_payment(
  p_subscription_id uuid,
  p_amount_usd numeric,
  p_method text,
  p_period_months integer default 1,
  p_reference text default null,
  p_paid_at timestamptz default now(),
  p_notes text default null
)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub public.subscriptions;
  v_base timestamptz;
  v_payment public.payments;
begin
  if not public.is_superadmin() then
    raise exception 'access_denied' using errcode = '42501';
  end if;

  select * into v_sub from public.subscriptions where id = p_subscription_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  v_base := greatest(v_sub.current_period_end, v_sub.trial_ends_at, now());

  update public.subscriptions s
  set current_period_end = v_base + make_interval(months => p_period_months),
      status = public.subscription_status_of(
        case when s.status = 'canceled' then 'active' else s.status end,
        s.trial_ends_at, v_base + make_interval(months => p_period_months), s.grace_days)
  where s.id = p_subscription_id;

  insert into public.payments (
    subscription_id, amount_usd, method, reference, paid_at, period_months, registered_by, notes
  ) values (
    p_subscription_id, p_amount_usd, p_method, p_reference, coalesce(p_paid_at, now()),
    p_period_months, auth.uid(), p_notes
  )
  returning * into v_payment;

  return v_payment;
end;
$$;

-- -------------------------------------------------------------
-- Dispositivos: registrar (genera serial + secreto) y rotar secreto
-- El secreto se devuelve UNA sola vez; en la base solo queda su sha256.
-- -------------------------------------------------------------
create or replace function public.register_device(p_modality text default null)
returns table (id uuid, serial text, secret text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_serial text;
  v_secret text;
  v_id uuid;
begin
  if not public.is_superadmin() then
    raise exception 'access_denied' using errcode = '42501';
  end if;

  loop
    v_serial := 'RS-' || lpad(nextval('public.device_serial_seq')::text, 6, '0');
    exit when not exists (select 1 from public.devices d where d.serial = v_serial);
  end loop;

  v_secret := encode(extensions.gen_random_bytes(24), 'hex');

  insert into public.devices (serial, secret_hash, modality, status)
  values (v_serial, encode(extensions.digest(v_secret, 'sha256'), 'hex'), p_modality, 'inventory')
  returning devices.id into v_id;

  return query select v_id, v_serial, v_secret;
end;
$$;

create or replace function public.rotate_device_secret(p_device_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
begin
  if not public.is_superadmin() then
    raise exception 'access_denied' using errcode = '42501';
  end if;
  v_secret := encode(extensions.gen_random_bytes(24), 'hex');
  update public.devices
  set secret_hash = encode(extensions.digest(v_secret, 'sha256'), 'hex')
  where id = p_device_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  return v_secret;
end;
$$;

-- -------------------------------------------------------------
-- Tarea diaria: actualizar estados guardados de las suscripciones
-- -------------------------------------------------------------
create or replace function public.refresh_subscription_statuses()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.subscriptions s
  set status = public.subscription_status_of(s.status, s.trial_ends_at, s.current_period_end, s.grace_days)
  where s.status <> 'canceled'
    and s.status is distinct from
        public.subscription_status_of(s.status, s.trial_ends_at, s.current_period_end, s.grace_days);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- -------------------------------------------------------------
-- Tarea diaria: generar alertas
--   device_offline     → equipo activo sin conexión > 24 h
--   driver_exclusions  → cruces del conductor ayer por encima del límite
--   subscription       → suscripción en gracia o vencida
-- No repite una alerta del mismo tipo y bus en las últimas 24 h.
-- -------------------------------------------------------------
create or replace function public.generate_alerts(p_driver_threshold integer default 20)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer := 0;
  v_n integer;
begin
  -- Equipos sin conexión
  insert into public.alerts (organization_id, bus_id, type, message)
  select d.organization_id, d.bus_id, 'device_offline',
         format('El equipo %s del bus %s no se conecta desde hace más de 24 horas.', d.serial, b.plate)
  from public.devices d
  join public.buses b on b.id = d.bus_id
  where d.status = 'active'
    and d.organization_id is not null
    and coalesce(d.last_seen_at, d.created_at) < now() - interval '24 hours'
    and not exists (
      select 1 from public.alerts a
      where a.bus_id = d.bus_id and a.type = 'device_offline' and a.created_at > now() - interval '24 hours'
    );
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  -- Exclusiones del conductor (día de ayer en la zona de la organización)
  insert into public.alerts (organization_id, bus_id, type, message)
  select x.organization_id, x.bus_id, 'driver_exclusions',
         format('El bus %s registró %s cruces del conductor ayer (límite %s). Revisa posibles irregularidades.',
                x.plate, x.n, p_driver_threshold)
  from (
    select e.organization_id, e.bus_id, b.plate, count(*) as n
    from public.count_events e
    join public.buses b on b.id = e.bus_id
    join public.organizations o on o.id = e.organization_id
    where e.is_driver
      and e.occurred_at >= ((now() at time zone o.timezone)::date - 1)::timestamp at time zone o.timezone
      and e.occurred_at < ((now() at time zone o.timezone)::date)::timestamp at time zone o.timezone
    group by e.organization_id, e.bus_id, b.plate
    having count(*) > p_driver_threshold
  ) x
  where not exists (
    select 1 from public.alerts a
    where a.bus_id = x.bus_id and a.type = 'driver_exclusions' and a.created_at > now() - interval '24 hours'
  );
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  -- Suscripciones en gracia o vencidas
  insert into public.alerts (organization_id, bus_id, type, message)
  select s.organization_id, null, 'subscription',
         case s.status
           when 'grace' then 'Tu suscripción está vencida y en período de gracia. Registra tu pago para evitar el bloqueo.'
           else 'Tu suscripción está vencida. El acceso al panel está bloqueado hasta registrar el pago.'
         end
  from public.subscriptions s
  where s.status in ('grace', 'expired')
    and not exists (
      select 1 from public.alerts a
      where a.organization_id = s.organization_id and a.type = 'subscription'
        and a.created_at > now() - interval '24 hours'
    );
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  return v_total;
end;
$$;

-- -------------------------------------------------------------
-- Resumen para el panel admin
-- -------------------------------------------------------------
create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  if not public.is_superadmin() then
    raise exception 'access_denied' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'organizations', (select count(*) from public.organizations),
    'buses', (select count(*) from public.buses where is_active),
    'devices_active', (select count(*) from public.devices where status = 'active'),
    'devices_online', (select count(*) from public.devices
                       where status = 'active' and last_seen_at > now() - interval '1 hour'),
    'devices_offline', (select count(*) from public.devices
                        where status = 'active'
                          and (last_seen_at is null or last_seen_at <= now() - interval '1 hour')),
    'devices_inventory', (select count(*) from public.devices where status = 'inventory'),
    'subscriptions_by_status', (
      select coalesce(jsonb_object_agg(st, n), '{}'::jsonb) from (
        select public.subscription_status_of(s.status, s.trial_ends_at, s.current_period_end, s.grace_days) as st,
               count(*) as n
        from public.subscriptions s
        group by 1
      ) t
    ),
    'estimated_mrr_usd', (
      select coalesce(sum(
        p.monthly_price_usd * s.bus_quantity
        * (1 - case when s.bus_quantity >= 5 then s.fleet_discount_pct else 0 end / 100.0)
      ), 0)
      from public.subscriptions s
      join public.plans p on p.id = s.plan_id
      where public.subscription_status_of(s.status, s.trial_ends_at, s.current_period_end, s.grace_days)
            in ('active', 'grace')
    ),
    'events_today', (select count(*) from public.count_events where occurred_at > now() - interval '24 hours')
  ) into v;
  return v;
end;
$$;

-- -------------------------------------------------------------
-- Permisos de ejecución: nada para anon; las funciones validan el rol internamente.
-- -------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;

-- Tareas de servidor: solo service role
revoke execute on function public.refresh_subscription_statuses() from authenticated;
revoke execute on function public.generate_alerts(integer) from authenticated;
