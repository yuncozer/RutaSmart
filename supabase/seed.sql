-- =============================================================
-- RutaSmart · Datos de prueba (SOLO DESARROLLO)
--
-- Usuarios (contraseña para todos: RutaSmart2026!)
--   admin@rutasmart.dev           superadmin
--   owner@losandes.dev            owner  · Transporte Los Andes (VE) · plan Flota · activa
--   conductor@losandes.dev        driver · asignado al bus ABC-123
--   owner@rutasnorte.dev          owner  · Rutas del Norte (CO) · plan Pro · prueba gratis
--   owner@expresostachira.dev     owner  · Expresos Táchira (VE) · plan Básico · en gracia
--   owner@cootransnorte.dev       owner  · Cootransnorte (CO) · plan Básico · vencida (alquiler)
--
-- Dispositivos: RS-000001 … RS-000005 con secretos dev-secret-1 … dev-secret-5
-- (RS-000005 está deshabilitado por alquiler impago)
-- =============================================================

-- -------------------------------------------------------------
-- Usuarios de Auth
-- -------------------------------------------------------------
do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('00000000-0000-4000-a000-000000000001'::uuid, 'admin@rutasmart.dev', 'Administrador RutaSmart'),
      ('00000000-0000-4000-a000-000000000002'::uuid, 'owner@losandes.dev', 'María Rondón'),
      ('00000000-0000-4000-a000-000000000003'::uuid, 'conductor@losandes.dev', 'José Contreras'),
      ('00000000-0000-4000-a000-000000000004'::uuid, 'owner@rutasnorte.dev', 'Andrés Galvis'),
      ('00000000-0000-4000-a000-000000000005'::uuid, 'owner@expresostachira.dev', 'Luisa Pérez'),
      ('00000000-0000-4000-a000-000000000006'::uuid, 'owner@cootransnorte.dev', 'Carlos Rincón')
    ) as t(id, email, full_name)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
      extensions.crypt('RutaSmart2026!', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', u.full_name), now(), now(), '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), u.id, u.id::text,
      jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
      'email', now(), now(), now()
    );
  end loop;
end;
$$;

update public.profiles set is_superadmin = true where id = '00000000-0000-4000-a000-000000000001';
update public.profiles set phone = '+58 414 0000001' where id = '00000000-0000-4000-a000-000000000002';

-- -------------------------------------------------------------
-- Planes
-- -------------------------------------------------------------
insert into public.plans (id, code, name, monthly_price_usd, features) values
  ('10000000-0000-4000-a000-000000000001', 'basic', 'Básico', 15,
   '{"daily_counts":true,"export":true,"wifi_sync":true,"gps_tracking":true,"max_users":1}'),
  ('10000000-0000-4000-a000-000000000002', 'pro', 'Pro', 25,
   '{"daily_counts":true,"export":true,"wifi_sync":true,"gps_tracking":true,"hourly_dashboard":true,"route_dashboard":true,"comparisons":true,"alerts":true,"driver_exclusion":true,"sim_4g":true,"max_users":3}'),
  ('10000000-0000-4000-a000-000000000003', 'fleet', 'Flota', 35,
   '{"daily_counts":true,"export":true,"wifi_sync":true,"gps_tracking":true,"hourly_dashboard":true,"route_dashboard":true,"comparisons":true,"alerts":true,"driver_exclusion":true,"sim_4g":true,"fleet_view":true,"multi_user":true,"device_status":true,"priority_support":true,"max_users":50}');

-- -------------------------------------------------------------
-- Organizaciones
-- -------------------------------------------------------------
insert into public.organizations (id, name, tax_id, country, timezone, contact_phone, contact_email) values
  ('20000000-0000-4000-a000-000000000001', 'Transporte Los Andes C.A.', 'J-40123456-7', 'VE', 'America/Caracas', '+58 414 0000001', 'owner@losandes.dev'),
  ('20000000-0000-4000-a000-000000000002', 'Rutas del Norte S.A.S.', '901234567-8', 'CO', 'America/Bogota', '+57 310 0000002', 'owner@rutasnorte.dev'),
  ('20000000-0000-4000-a000-000000000003', 'Expresos Táchira', 'J-41234567-0', 'VE', 'America/Caracas', '+58 424 0000003', 'owner@expresostachira.dev'),
  ('20000000-0000-4000-a000-000000000004', 'Cootransnorte', '900765432-1', 'CO', 'America/Bogota', '+57 320 0000004', 'owner@cootransnorte.dev');

insert into public.memberships (user_id, organization_id, role) values
  ('00000000-0000-4000-a000-000000000002', '20000000-0000-4000-a000-000000000001', 'owner'),
  ('00000000-0000-4000-a000-000000000003', '20000000-0000-4000-a000-000000000001', 'driver'),
  ('00000000-0000-4000-a000-000000000004', '20000000-0000-4000-a000-000000000002', 'owner'),
  ('00000000-0000-4000-a000-000000000005', '20000000-0000-4000-a000-000000000003', 'owner'),
  ('00000000-0000-4000-a000-000000000006', '20000000-0000-4000-a000-000000000004', 'owner');

-- -------------------------------------------------------------
-- Suscripciones (una por estado)
-- -------------------------------------------------------------
insert into public.subscriptions (
  id, organization_id, plan_id, bus_quantity, modality, billing_cycle,
  started_at, trial_ends_at, current_period_end, status, deposit_usd, min_contract_months, notes
) values
  -- Activa: compró los equipos, ya pasó la prueba y paga mensual
  ('30000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001',
   '10000000-0000-4000-a000-000000000003', 3, 'purchase', 'monthly',
   now() - interval '200 days', now() - interval '200 days' + interval '3 months',
   now() + interval '20 days', 'active', null, null, 'Cliente piloto'),
  -- En prueba gratis (compra, 3 meses)
  ('30000000-0000-4000-a000-000000000002', '20000000-0000-4000-a000-000000000002',
   '10000000-0000-4000-a000-000000000002', 2, 'purchase', 'monthly',
   now() - interval '30 days', now() - interval '30 days' + interval '3 months',
   now() - interval '30 days' + interval '3 months', 'trialing', null, null, null),
  -- En gracia (alquiler, venció hace 3 días)
  ('30000000-0000-4000-a000-000000000003', '20000000-0000-4000-a000-000000000003',
   '10000000-0000-4000-a000-000000000001', 1, 'rental', 'monthly',
   now() - interval '100 days', null, now() - interval '3 days', 'grace', 50, 6, null),
  -- Vencida (alquiler, venció hace 20 días)
  ('30000000-0000-4000-a000-000000000004', '20000000-0000-4000-a000-000000000004',
   '10000000-0000-4000-a000-000000000001', 1, 'rental', 'monthly',
   now() - interval '150 days', null, now() - interval '20 days', 'expired', 50, 6, 'Contactar por WhatsApp');

insert into public.payments (subscription_id, amount_usd, method, reference, paid_at, period_months, registered_by) values
  ('30000000-0000-4000-a000-000000000001', 94.50, 'zelle', 'ZL-88213', now() - interval '40 days', 1, '00000000-0000-4000-a000-000000000001'),
  ('30000000-0000-4000-a000-000000000001', 94.50, 'pago_movil', '0102-554433', now() - interval '10 days', 1, '00000000-0000-4000-a000-000000000001'),
  ('30000000-0000-4000-a000-000000000003', 15.00, 'binance', 'BN-1122', now() - interval '33 days', 1, '00000000-0000-4000-a000-000000000001');

-- -------------------------------------------------------------
-- Buses
-- -------------------------------------------------------------
insert into public.buses (id, organization_id, plate, alias, route_name) values
  ('40000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001', 'ABC-123', 'Unidad 01', 'San Cristóbal – Táriba'),
  ('40000000-0000-4000-a000-000000000002', '20000000-0000-4000-a000-000000000001', 'XYZ-789', 'Unidad 02', 'San Cristóbal – Rubio'),
  ('40000000-0000-4000-a000-000000000003', '20000000-0000-4000-a000-000000000002', 'TKN-456', 'Bus 12', 'Cúcuta Centro – Atalaya'),
  ('40000000-0000-4000-a000-000000000004', '20000000-0000-4000-a000-000000000003', 'AB1-22C', 'Expreso 1', 'Terminal – Barrio Obrero'),
  ('40000000-0000-4000-a000-000000000005', '20000000-0000-4000-a000-000000000004', 'UFA-321', 'Móvil 7', 'Villa del Rosario – Cúcuta');

insert into public.driver_buses (driver_user_id, bus_id) values
  ('00000000-0000-4000-a000-000000000003', '40000000-0000-4000-a000-000000000001');

-- -------------------------------------------------------------
-- Dispositivos (secretos conocidos de desarrollo: dev-secret-N)
-- -------------------------------------------------------------
insert into public.devices (
  id, serial, secret_hash, bus_id, organization_id, status, modality,
  firmware_version, model_version, last_seen_at, last_battery, last_rssi, last_lat, last_lng
)
select
  ('50000000-0000-4000-a000-00000000000' || n)::uuid,
  'RS-00000' || n,
  encode(extensions.digest('dev-secret-' || n, 'sha256'), 'hex'),
  ('40000000-0000-4000-a000-00000000000' || n)::uuid,
  org::uuid,
  st,
  modality,
  '0.1.0', 'm-0.1',
  now() - seen,
  battery, rssi, lat, lng
from (values
  (1, '20000000-0000-4000-a000-000000000001', 'active', 'purchase', interval '3 minutes', 92, -61, 7.7669, -72.2250),
  (2, '20000000-0000-4000-a000-000000000001', 'active', 'purchase', interval '9 minutes', 78, -70, 7.7710, -72.2190),
  (3, '20000000-0000-4000-a000-000000000002', 'active', 'purchase', interval '15 minutes', 85, -66, 7.8939, -72.5078),
  (4, '20000000-0000-4000-a000-000000000003', 'active', 'rental', interval '2 days', 34, -88, 7.7600, -72.2300),
  (5, '20000000-0000-4000-a000-000000000004', 'disabled', 'rental', interval '20 days', 61, -75, 7.8300, -72.4700)
) as t(n, org, st, modality, seen, battery, rssi, lat, lng);

-- Los próximos seriales generados desde el panel empiezan en RS-000006
select setval('public.device_serial_seq', 5);

-- Un dispositivo en inventario (sin asignar), secreto dev-secret-6
insert into public.devices (id, serial, secret_hash, status)
values ('50000000-0000-4000-a000-000000000006', 'RS-000006',
        encode(extensions.digest('dev-secret-6', 'sha256'), 'hex'), 'inventory');
select setval('public.device_serial_seq', 6);

insert into public.device_heartbeats (device_id, reported_at, battery, rssi, free_storage, firmware_version, lat, lng)
select d.id, d.last_seen_at - (g * interval '5 minutes'), d.last_battery, d.last_rssi, 12000, '0.1.0', d.last_lat, d.last_lng
from public.devices d, generate_series(0, 5) g
where d.last_seen_at is not null;

-- -------------------------------------------------------------
-- Eventos de conteo de los últimos 30 días
-- Paradas cada pocos minutos, picos 6–8 am y 5–7 pm,
-- bajadas ≈ subidas (nunca más bajadas que pasajeros a bordo en el día).
-- -------------------------------------------------------------
-- Rutas reales aproximadas (origen → destino) para ubicar paradas y recorridos GPS
create temp table seed_routes (bus_id uuid primary key, from_lat float8, from_lng float8, to_lat float8, to_lng float8);
insert into seed_routes values
  ('40000000-0000-4000-a000-000000000001', 7.7669, -72.2250, 7.8189, -72.2246), -- San Cristóbal – Táriba
  ('40000000-0000-4000-a000-000000000002', 7.7669, -72.2250, 7.7013, -72.3586), -- San Cristóbal – Rubio
  ('40000000-0000-4000-a000-000000000003', 7.8891, -72.4967, 7.8869, -72.5370), -- Cúcuta Centro – Atalaya
  ('40000000-0000-4000-a000-000000000004', 7.7563, -72.2276, 7.7745, -72.2120), -- Terminal – Barrio Obrero
  ('40000000-0000-4000-a000-000000000005', 7.8337, -72.4720, 7.8939, -72.5078); -- Villa del Rosario – Cúcuta

-- Punto de la ruta en la fracción f (0 = origen, 1 = destino), con una curva suave
create or replace function pg_temp.route_point(r seed_routes, f float8, out lat float8, out lng float8)
language sql immutable as $$
  select r.from_lat + (r.to_lat - r.from_lat) * f + sin(pi() * f) * 0.004,
         r.from_lng + (r.to_lng - r.from_lng) * f - sin(pi() * f) * 0.003
$$;

select setseed(0.42);

with buses as (
  select b.id as bus_id, b.organization_id, o.timezone, d.id as device_id,
         d.last_lat as lat, d.last_lng as lng
  from public.buses b
  join public.organizations o on o.id = b.organization_id
  join public.devices d on d.bus_id = b.id
),
hours as (
  -- subidas por hora (local) según el perfil del día
  select bus_id, organization_id, timezone, device_id, lat, lng, day, h,
         (case
            when h in (6, 7, 17, 18) then 22
            when h in (8, 12, 13, 16, 19) then 14
            when h between 9 and 15 then 9
            else 4
          end
          * case when extract(isodow from day) = 7 then 0.5
                 when extract(isodow from day) = 6 then 0.8
                 else 1 end
          * (0.75 + random() * 0.5))::int as boardings
  from buses,
       generate_series(current_date - 29, current_date, interval '1 day') as day,
       generate_series(5, 20) as h
),
boardings as (
  select hours.*, g,
         ((day::date + make_interval(hours => h, mins => (random() * 59)::int, secs => (random() * 59)::int))
           at time zone timezone) as t_in
  from hours, generate_series(1, greatest(boardings, 0)) g
),
events as (
  -- cada subida genera una subida y (casi siempre) una bajada posterior;
  -- las subidas se concentran en las primeras paradas y las bajadas en las últimas
  select bus_id, organization_id, device_id, 'in' as direction, t_in as occurred_at,
         least(11, floor(power(random(), 1.6) * 12))::int as stop
  from boardings
  union all
  select bus_id, organization_id, device_id, 'out',
         t_in + make_interval(mins => 4 + (random() * 40)::int),
         least(11, floor((1 - power(random(), 1.6)) * 12))::int
  from boardings
  where random() < 0.97
)
insert into public.count_events (id, device_id, bus_id, organization_id, occurred_at, direction, is_driver, confidence, lat, lng)
select gen_random_uuid(), ev.device_id, ev.bus_id, ev.organization_id, ev.occurred_at, ev.direction, false,
       round((0.8 + random() * 0.19)::numeric, 2)::real,
       pt.lat + (random() - 0.5) * 0.0004, pt.lng + (random() - 0.5) * 0.0004
from events ev
join seed_routes r on r.bus_id = ev.bus_id
cross join lateral pg_temp.route_point(r, ev.stop / 11.0) pt
where ev.occurred_at <= now();

-- Cruces del conductor (2–6 por día; se excluyen de los totales)
insert into public.count_events (id, device_id, bus_id, organization_id, occurred_at, direction, is_driver, confidence)
select gen_random_uuid(), d.id, b.id, b.organization_id,
       ((day::date + make_interval(hours => 5 + (random() * 15)::int, mins => (random() * 59)::int))
         at time zone o.timezone),
       case when g % 2 = 0 then 'in' else 'out' end, true, 0.9
from public.buses b
join public.organizations o on o.id = b.organization_id
join public.devices d on d.bus_id = b.id
cross join generate_series(current_date - 29, current_date, interval '1 day') as day
cross join lateral generate_series(1, 2 + (random() * 4)::int) g
where ((day::date + interval '5 hours') at time zone o.timezone) <= now();

delete from public.count_events where occurred_at > now();

-- -------------------------------------------------------------
-- Recorridos GPS de los últimos 3 días (un punto por minuto, 5:30–21:00)
-- Viajes ida/vuelta de 60 min con 10 min de descanso en terminal.
-- -------------------------------------------------------------
insert into public.device_positions (id, device_id, bus_id, organization_id, recorded_at, lat, lng, speed_kmh, heading, accuracy_m, satellites)
select gen_random_uuid(), d.id, b.id, b.organization_id, t.ts,
       pt.lat + (random() - 0.5) * 0.0002, pt.lng + (random() - 0.5) * 0.0002,
       case when t.phase >= 60 then 0 else round((15 + random() * 25)::numeric, 1) end,
       (random() * 359)::int, round((3 + random() * 6)::numeric, 1), 7 + (random() * 6)::int
from public.buses b
join public.organizations o on o.id = b.organization_id
join public.devices d on d.bus_id = b.id
join seed_routes r on r.bus_id = b.id
cross join lateral (
  select ((day::date + make_interval(hours => 5, mins => 30 + m)) at time zone o.timezone) as ts,
         m % 70 as phase,
         (m / 70) % 2 as back
  from generate_series(current_date - 2, current_date, interval '1 day') day,
       generate_series(0, 929) m
) t
cross join lateral pg_temp.route_point(
  r,
  case when t.back = 0 then least(t.phase, 60) / 60.0 else 1 - least(t.phase, 60) / 60.0 end
) pt
where t.ts <= now() and d.status = 'active';

-- Última posición conocida en el dispositivo
update public.devices d
set last_lat = p.lat, last_lng = p.lng
from (
  select distinct on (device_id) device_id, lat, lng
  from public.device_positions order by device_id, recorded_at desc
) p
where p.device_id = d.id;

-- -------------------------------------------------------------
-- Alertas de ejemplo
-- -------------------------------------------------------------
insert into public.alerts (organization_id, bus_id, type, message) values
  ('20000000-0000-4000-a000-000000000003', '40000000-0000-4000-a000-000000000004', 'device_offline',
   'El equipo RS-000004 del bus AB1-22C no se conecta desde hace más de 24 horas.'),
  ('20000000-0000-4000-a000-000000000003', null, 'subscription',
   'Tu suscripción está vencida y en período de gracia. Registra tu pago para evitar el bloqueo.');
