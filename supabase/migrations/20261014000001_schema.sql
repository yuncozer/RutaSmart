-- =============================================================
-- RutaSmart · Esquema principal
-- Todas las fechas en UTC (timestamptz). PK uuid.
-- =============================================================

create extension if not exists pgcrypto with schema extensions;

-- Actualiza updated_at automáticamente
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -------------------------------------------------------------
-- Organizaciones (clientes)
-- -------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  tax_id text,
  country text not null default 'VE' check (country in ('VE', 'CO')),
  timezone text not null default 'America/Caracas'
    check (timezone in ('America/Caracas', 'America/Bogota')),
  contact_phone text,
  contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------
-- Perfiles (1:1 con auth.users)
-- -------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  is_superadmin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------
-- Membresías usuario ↔ organización
-- -------------------------------------------------------------
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  role text not null check (role in ('owner', 'driver')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, organization_id)
);
create index memberships_org_idx on public.memberships (organization_id);

-- -------------------------------------------------------------
-- Buses
-- -------------------------------------------------------------
create table public.buses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  plate text not null check (length(trim(plate)) > 0),
  alias text,
  route_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, plate)
);
create index buses_org_idx on public.buses (organization_id);

-- Conductores asignados a buses
create table public.driver_buses (
  driver_user_id uuid not null references public.profiles (id) on delete cascade,
  bus_id uuid not null references public.buses (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (driver_user_id, bus_id)
);
create index driver_buses_bus_idx on public.driver_buses (bus_id);

-- -------------------------------------------------------------
-- Dispositivos (ESP32-S3)
-- -------------------------------------------------------------
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  serial text not null unique check (serial ~ '^RS-[0-9]{6}$'),
  secret_hash text not null, -- sha256 hex del secreto; el secreto nunca se guarda
  bus_id uuid references public.buses (id) on delete set null,
  organization_id uuid references public.organizations (id) on delete set null,
  status text not null default 'inventory'
    check (status in ('inventory', 'active', 'disabled', 'retired')),
  modality text check (modality in ('purchase', 'rental')),
  firmware_version text,
  model_version text,
  last_seen_at timestamptz,
  last_battery smallint,
  last_rssi smallint,
  last_lat double precision,
  last_lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Un bus tiene como máximo un dispositivo asignado
create unique index devices_bus_unique on public.devices (bus_id) where bus_id is not null;
create index devices_org_idx on public.devices (organization_id);

-- Secuencia para generar seriales RS-000001, RS-000002, ...
create sequence public.device_serial_seq start 1;

-- -------------------------------------------------------------
-- Planes
-- -------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('basic', 'pro', 'fleet')),
  name text not null,
  monthly_price_usd numeric(10, 2) not null check (monthly_price_usd >= 0),
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------
-- Suscripciones (una activa por organización)
-- -------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  plan_id uuid not null references public.plans (id),
  bus_quantity integer not null default 1 check (bus_quantity > 0),
  modality text not null check (modality in ('purchase', 'rental')),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'annual')),
  started_at timestamptz not null default now(),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  grace_days integer not null default 7 check (grace_days >= 0),
  status text not null default 'active'
    check (status in ('trialing', 'active', 'grace', 'expired', 'canceled')),
  deposit_usd numeric(10, 2),
  min_contract_months integer,
  fleet_discount_pct numeric(5, 2) not null default 10 check (fleet_discount_pct between 0 and 100),
  annual_free_months integer not null default 2 check (annual_free_months between 0 and 11),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index subscriptions_one_active_per_org
  on public.subscriptions (organization_id) where status <> 'canceled';

-- -------------------------------------------------------------
-- Pagos (registro manual en el MVP)
-- -------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  amount_usd numeric(10, 2) not null check (amount_usd >= 0),
  method text not null
    check (method in ('pago_movil', 'zelle', 'binance', 'transfer', 'cash', 'other')),
  reference text,
  paid_at timestamptz not null default now(),
  period_months integer not null default 1 check (period_months > 0),
  registered_by uuid references public.profiles (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_subscription_idx on public.payments (subscription_id, paid_at desc);

-- -------------------------------------------------------------
-- Eventos de conteo (tabla principal de datos)
-- id generado POR EL DISPOSITIVO → idempotencia
-- -------------------------------------------------------------
create table public.count_events (
  id uuid primary key,
  device_id uuid not null references public.devices (id),
  bus_id uuid not null references public.buses (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  occurred_at timestamptz not null,
  direction text not null check (direction in ('in', 'out')),
  is_driver boolean not null default false,
  confidence real check (confidence is null or confidence between 0 and 1),
  lat double precision,
  lng double precision,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index count_events_bus_time_idx on public.count_events (bus_id, occurred_at);
create index count_events_org_time_idx on public.count_events (organization_id, occurred_at);

-- -------------------------------------------------------------
-- Heartbeats de dispositivos
-- -------------------------------------------------------------
create table public.device_heartbeats (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices (id) on delete cascade,
  reported_at timestamptz not null default now(),
  battery smallint,
  rssi smallint,
  free_storage integer, -- MB
  firmware_version text,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index device_heartbeats_device_idx on public.device_heartbeats (device_id, reported_at desc);

-- -------------------------------------------------------------
-- Versiones de firmware (OTA)
-- -------------------------------------------------------------
create table public.firmware_releases (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  model_version text,
  file_path text not null, -- ruta en el bucket "firmware" de Storage
  checksum_sha256 text not null,
  is_stable boolean not null default false,
  release_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------
-- Alertas (MVP simple)
-- -------------------------------------------------------------
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  bus_id uuid references public.buses (id) on delete cascade,
  type text not null check (type in ('device_offline', 'driver_exclusions', 'subscription')),
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index alerts_org_idx on public.alerts (organization_id, created_at desc);

-- -------------------------------------------------------------
-- Triggers updated_at
-- -------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'organizations', 'profiles', 'memberships', 'buses', 'driver_buses', 'devices', 'plans',
    'subscriptions', 'payments', 'count_events', 'device_heartbeats', 'firmware_releases', 'alerts'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

-- -------------------------------------------------------------
-- Crear perfil automáticamente al registrarse un usuario
-- -------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
