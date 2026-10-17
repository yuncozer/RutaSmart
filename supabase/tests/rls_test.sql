-- =============================================================
-- RutaSmart · Tests de RLS y funciones (requiere seed.sql cargado)
-- Todo corre dentro de una transacción que se revierte al final.
-- Ejecutar: pnpm db:test   (ver supabase/tests/run.sh)
-- =============================================================
\set ON_ERROR_STOP on
begin;

create function pg_temp.check(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is distinct from true then
    raise exception 'FALLÓ: %', msg;
  end if;
  raise notice 'OK: %', msg;
end;
$$;
grant execute on function pg_temp.check(boolean, text) to anon, authenticated;

-- Ejecuta SQL y devuelve el SQLSTATE del error ('' si no hubo error)
create function pg_temp.err(sql text) returns text language plpgsql as $$
begin
  execute sql;
  return '';
exception when others then
  return sqlstate || ':' || sqlerrm;
end;
$$;
grant execute on function pg_temp.err(text) to anon, authenticated;

-- ---------- anon ----------
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select pg_temp.check((select count(*) from public.plans) = 3, 'anon ve los 3 planes');
select pg_temp.check(pg_temp.err('select * from public.organizations') like '42501%', 'anon no puede leer organizaciones');

-- ---------- superadmin ----------
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-a000-000000000001', true);
select pg_temp.check((select count(*) from public.organizations) = 4, 'superadmin ve todas las organizaciones');
select pg_temp.check((select count(*) from public.devices) = 6, 'superadmin ve todos los dispositivos');
select pg_temp.check((select (public.admin_overview() ->> 'organizations')::int) = 4, 'admin_overview funciona');

-- register_payment extiende el período de la suscripción vencida desde hoy
select public.register_payment('30000000-0000-4000-a000-000000000004', 15, 'zelle', 1, 'TEST-1');
select pg_temp.check(
  (select current_period_end between now() + interval '27 days' and now() + interval '32 days'
   from public.subscriptions where id = '30000000-0000-4000-a000-000000000004'),
  'register_payment extiende 1 mes desde hoy si estaba vencida');
select pg_temp.check(
  public.get_subscription_status('20000000-0000-4000-a000-000000000004') = 'active',
  'tras el pago la suscripción queda activa');

-- register_device genera serial y secreto
select pg_temp.check(
  (select serial ~ '^RS-[0-9]{6}$' and length(secret) = 48 from public.register_device('purchase')),
  'register_device devuelve serial y secreto');

-- ---------- owner A (Transporte Los Andes, activa) ----------
select set_config('request.jwt.claim.sub', '00000000-0000-4000-a000-000000000002', true);
select pg_temp.check((select count(*) from public.organizations) = 1, 'owner ve solo su organización');
select pg_temp.check((select count(*) from public.buses) = 2, 'owner ve solo sus 2 buses');
select pg_temp.check(
  (select count(*) from public.count_events where organization_id <> '20000000-0000-4000-a000-000000000001') = 0,
  'owner no ve conteos de otras organizaciones');
select pg_temp.check((select count(*) from public.subscriptions) = 1, 'owner ve su suscripción');
select pg_temp.check((select count(*) from public.payments) = 2, 'owner ve sus pagos');
select pg_temp.check(
  pg_temp.err('select secret_hash from public.devices') like '42501%',
  'owner no puede leer secret_hash');
select pg_temp.check(
  pg_temp.err($q$insert into public.count_events (id, device_id, bus_id, organization_id, occurred_at, direction)
    values (gen_random_uuid(), '50000000-0000-4000-a000-000000000001', '40000000-0000-4000-a000-000000000001',
            '20000000-0000-4000-a000-000000000001', now(), 'in')$q$) like '42501%',
  'owner no puede insertar count_events');
select pg_temp.check(
  pg_temp.err($q$update public.profiles set is_superadmin = true where id = auth.uid()$q$) like '42501%',
  'owner no puede volverse superadmin');
select pg_temp.check(
  pg_temp.err($q$select public.register_payment('30000000-0000-4000-a000-000000000001', 1, 'cash')$q$) like '42501%',
  'owner no puede registrar pagos');

-- Dashboard: excluye los cruces del conductor
select pg_temp.check(
  (select sum(ins) from public.daily_counts('20000000-0000-4000-a000-000000000001', current_date - 30, current_date))
  = (select count(*) from public.count_events
     where organization_id = '20000000-0000-4000-a000-000000000001' and direction = 'in' and not is_driver),
  'daily_counts suma subidas sin el conductor');
select pg_temp.check(
  (select sum(driver_crossings) from public.daily_counts('20000000-0000-4000-a000-000000000001', current_date - 30, current_date)) > 0,
  'daily_counts informa los cruces del conductor aparte');
select pg_temp.check(
  (select count(*) from public.hourly_counts('40000000-0000-4000-a000-000000000001', current_date - 1)) = 24,
  'hourly_counts devuelve 24 horas');
select pg_temp.check(
  pg_temp.err($q$select * from public.daily_counts('20000000-0000-4000-a000-000000000002', current_date - 1, current_date)$q$) like '42501%',
  'owner no puede consultar el dashboard de otra organización');

-- GPS
select pg_temp.check(
  (select count(*) from public.fleet_positions('20000000-0000-4000-a000-000000000001') where lat is not null) = 2,
  'fleet_positions devuelve la posición de los 2 buses del owner');
select pg_temp.check(
  (select count(*) from public.bus_route('40000000-0000-4000-a000-000000000001', current_date - 1)) > 100,
  'bus_route devuelve el recorrido del día');
select pg_temp.check(
  (select count(*) from public.boarding_points('40000000-0000-4000-a000-000000000001', current_date - 1)) > 50,
  'boarding_points devuelve subidas y bajadas con ubicación');
select pg_temp.check(
  (select count(*) from public.stop_hotspots('20000000-0000-4000-a000-000000000001', current_date - 7, current_date)) between 5 and 25,
  'stop_hotspots agrupa las paradas con más movimiento');
select pg_temp.check(
  (select count(*) from public.device_positions where organization_id <> '20000000-0000-4000-a000-000000000001') = 0,
  'owner no ve posiciones GPS de otras organizaciones');
select pg_temp.check(
  pg_temp.err($q$insert into public.device_positions (id, device_id, bus_id, organization_id, recorded_at, lat, lng)
    values (gen_random_uuid(), '50000000-0000-4000-a000-000000000001', '40000000-0000-4000-a000-000000000001',
            '20000000-0000-4000-a000-000000000001', now(), 7.7, -72.2)$q$) like '42501%',
  'owner no puede insertar posiciones GPS');
select pg_temp.check(
  pg_temp.err($q$select * from public.fleet_positions('20000000-0000-4000-a000-000000000002')$q$) like '42501%',
  'owner no puede ver el mapa de otra organización');

-- Límite de buses (la suscripción cubre 3)
select pg_temp.check(
  pg_temp.err($q$insert into public.buses (organization_id, plate) values ('20000000-0000-4000-a000-000000000001', 'NEW-001')$q$) = '',
  'owner puede crear un bus dentro del límite');
select pg_temp.check(
  pg_temp.err($q$insert into public.buses (organization_id, plate) values ('20000000-0000-4000-a000-000000000001', 'NEW-002')$q$) like '%bus_limit_exceeded%',
  'se bloquea crear más buses que los cubiertos');
select pg_temp.check(
  pg_temp.err($q$insert into public.buses (organization_id, plate) values ('20000000-0000-4000-a000-000000000002', 'HACK-01')$q$) like '42501%',
  'owner no puede crear buses en otra organización');

-- ---------- driver ----------
select set_config('request.jwt.claim.sub', '00000000-0000-4000-a000-000000000003', true);
select pg_temp.check((select count(*) from public.buses) = 1, 'conductor ve solo su bus asignado');
select pg_temp.check(
  (select count(distinct bus_id) from public.count_events) = 1, 'conductor ve conteos solo de su bus');
select pg_temp.check((select count(*) from public.subscriptions) = 0, 'conductor no ve suscripciones');
select pg_temp.check((select count(*) from public.payments) = 0, 'conductor no ve pagos');
select pg_temp.check(
  (select count(distinct bus_id) from public.daily_counts('20000000-0000-4000-a000-000000000001', current_date - 7, current_date)) = 1,
  'daily_counts del conductor solo incluye su bus');
select pg_temp.check(
  pg_temp.err($q$select * from public.hourly_counts('40000000-0000-4000-a000-000000000002', current_date)$q$) like '42501%',
  'conductor no puede ver la hora a hora de otro bus');

select pg_temp.check(
  (select count(*) from public.fleet_positions('20000000-0000-4000-a000-000000000001')) = 1,
  'en el mapa en vivo el conductor ve solo su bus');
select pg_temp.check(
  pg_temp.err($q$select * from public.bus_route('40000000-0000-4000-a000-000000000002', current_date)$q$) like '42501%',
  'conductor no puede ver el recorrido de otro bus');
select pg_temp.check(
  (select count(distinct bus_id) from public.device_positions) = 1,
  'conductor ve posiciones GPS solo de su bus');

-- ---------- owner con suscripción en gracia ----------
select set_config('request.jwt.claim.sub', '00000000-0000-4000-a000-000000000005', true);
select pg_temp.check(public.get_subscription_status('20000000-0000-4000-a000-000000000003') = 'grace', 'estado grace');
select pg_temp.check(
  pg_temp.err($q$select * from public.daily_counts('20000000-0000-4000-a000-000000000003', current_date - 1, current_date)$q$) = '',
  'en gracia el dashboard sigue disponible');

-- ---------- owner con suscripción vencida (rollback del pago anterior no aplica: usamos otra org) ----------
reset role;
update public.subscriptions set current_period_end = now() - interval '30 days', status = 'expired'
  where id = '30000000-0000-4000-a000-000000000004';
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-a000-000000000006', true);
select pg_temp.check(public.get_subscription_status('20000000-0000-4000-a000-000000000004') = 'expired', 'estado expired');
select pg_temp.check(
  pg_temp.err($q$select * from public.daily_counts('20000000-0000-4000-a000-000000000004', current_date - 1, current_date)$q$) like 'P0001:subscription_expired%',
  'con suscripción vencida el dashboard devuelve error controlado');

select pg_temp.check(
  pg_temp.err($q$select * from public.fleet_positions('20000000-0000-4000-a000-000000000004')$q$) like 'P0001:subscription_expired%',
  'con suscripción vencida el mapa devuelve error controlado');

-- ---------- tareas de servidor ----------
select pg_temp.check(
  pg_temp.err('select public.generate_alerts()') like '42501%',
  'un usuario no puede ejecutar generate_alerts');
reset role;
select pg_temp.check(public.generate_alerts() >= 0, 'generate_alerts corre como servidor');
select pg_temp.check(public.refresh_subscription_statuses() >= 0, 'refresh_subscription_statuses corre');

rollback;
\echo '✔ Todos los tests de RLS pasaron'
