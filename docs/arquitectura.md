# Arquitectura de RutaSmart RU7

```
[Dispositivo ESP32-S3]
  Cámara → Modelo IA → Conteo (línea virtual) → microSD (cola local, UUID por evento)
        │  HTTPS (WiFi / 4G)                ▲  OTA (signed URL)
        ▼                                   │
[Next.js /api/device/*  en Vercel]  ────────┘
        │  service role (solo servidor)
        ▼
[Supabase Postgres + RLS]  ◄──  [App web Next.js]  ◄── admin / dueño / conductor
                                (anon key + sesión del usuario)
```

## Reglas clave

1. El dispositivo **nunca** habla con la base de datos: siempre pasa por `/api/device/*`.
2. La `service_role` key solo se usa en el servidor (`web/lib/supabase/admin.ts`, importa
   `server-only`).
3. La app web usa la `anon` key y la sesión del usuario; la seguridad la dan las políticas RLS
   (`supabase/migrations/20261014000002_rls.sql`).
4. Fechas en UTC (`timestamptz`); se muestran en la zona de la organización
   (`America/Caracas` / `America/Bogota`). Los agregados diarios/horarios se calculan en SQL en esa
   zona.
5. Los conteos se reciben aunque la suscripción esté vencida; lo que se bloquea es el panel.

## Dónde está cada cosa

| Tema                         | Archivo                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| Esquema                      | `supabase/migrations/20261014000001_schema.sql`                                       |
| RLS                          | `supabase/migrations/20261014000002_rls.sql`                                          |
| Funciones (dashboard, pagos) | `supabase/migrations/20261014000003_functions.sql`                                    |
| Estado de suscripción (TS)   | `web/lib/subscription.ts` (espejo de `subscription_status_of`)                        |
| Funciones por plan           | `web/lib/plans.ts` + `plans.features` (JSONB)                                         |
| API de dispositivos          | `web/lib/device/handlers.ts` (lógica) y `web/app/api/device/*`                        |
| Sesión y rol                 | `web/lib/auth.ts`, `web/middleware.ts`                                                |
| Acciones del admin           | `web/app/admin/actions.ts`                                                            |
| Acciones del cliente         | `web/app/app/actions.ts`                                                              |
| Exportación Excel/CSV        | `web/app/api/reports/route.ts`, `web/lib/reports.ts`                                  |
| Cron diario                  | `web/app/api/cron/daily/route.ts`, `web/vercel.json`                                  |
| GPS (mapa, recorrido)        | `supabase/migrations/20261016000007_gps.sql`, `web/components/map/`, `web/lib/geo.ts` |

## Roles

| Rol          | Cómo se define                  | Ve                                                    |
| ------------ | ------------------------------- | ----------------------------------------------------- |
| `superadmin` | `profiles.is_superadmin = true` | Todo                                                  |
| `owner`      | `memberships.role = 'owner'`    | Su organización completa, pagos y suscripción         |
| `driver`     | `memberships.role = 'driver'`   | Solo buses en `driver_buses` y sus conteos; sin pagos |

## Funciones SQL principales

- `get_subscription_status(org)` / `get_org_access(org)`: estado calculado en vivo + plan.
- `daily_counts(org, desde, hasta, bus?)`, `hourly_counts(bus, fecha)`: excluyen `is_driver` de
  los totales y devuelven los cruces del conductor aparte; lanzan `subscription_expired` si el
  plan está vencido.
- `register_payment(...)`: registra el pago y extiende `current_period_end` (desde hoy si estaba
  vencida, desde el corte si estaba vigente).
- `register_device()` / `rotate_device_secret()`: generan el secreto; en la base solo queda el sha256.
- `enforce_bus_limit` (trigger): bloquea más buses activos que los cubiertos.
- `refresh_subscription_statuses()`, `generate_alerts()`: tareas del cron diario.
- `fleet_positions(org)`, `bus_route(bus, fecha)`, `boarding_points(bus, fecha)`,
  `stop_hotspots(org, desde, hasta, bus?)`: módulo GPS (mismas reglas de acceso que el dashboard).
