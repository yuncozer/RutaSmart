# RutaSmart

Sistema para **contar automáticamente los pasajeros que suben y bajan de un autobús**
(Venezuela y Colombia). Un equipo ESP32-S3 con cámara cuenta localmente y envía solo eventos de
conteo a la nube; los dueños de buses ven métricas desde el teléfono y los administradores
gestionan clientes, equipos, planes y pagos.

## Estructura

```
rutasmart/
├── web/               App Next.js: landing, panel admin (/admin), portal cliente (/app) y API de dispositivos
├── supabase/          Migraciones SQL, seed de desarrollo y tests de RLS
├── tools/simulator/   Simulador de dispositivo (para desarrollar sin hardware)
├── firmware/          Contrato de API para el firmware ESP32-S3 (Fase 7)
└── docs/              Documentación (arquitectura, despliegue)
```

Stack: Next.js 15 (App Router) + TypeScript · Tailwind CSS 4 + componentes estilo shadcn/ui ·
Recharts · Zod · Supabase (Postgres + RLS + Auth + Storage) · Vercel · pnpm · Vitest.

## Requisitos

- Node.js 22 y pnpm 10 (`corepack enable`)
- Docker (para Supabase local)

## Correr todo localmente

```bash
pnpm install

# 1. Base de datos local (aplica migraciones y seed.sql)
pnpm db:start            # = supabase start
pnpm exec supabase status   # muestra URL, anon key y service_role key

# 2. Variables de entorno
cp .env.example web/.env.local
#   completa NEXT_PUBLIC_SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY con lo que mostró `supabase status`

# 3. App web
pnpm dev                 # http://localhost:3000

# 4. Simular equipos enviando conteos (en otra terminal)
pnpm simulate -- --serial RS-000001 --secret dev-secret-1 --days 1
pnpm simulate -- --buses 4 --days 2 --offline   # prueba la cola sin conexión e idempotencia
```

Para reiniciar la base con datos limpios: `pnpm db:reset`.

### Usuarios de prueba (contraseña `RutaSmart2026!`)

| Correo                      | Rol        | Situación                                          |
| --------------------------- | ---------- | -------------------------------------------------- |
| `admin@rutasmart.dev`       | superadmin | Panel `/admin`                                     |
| `owner@losandes.dev`        | dueño      | Transporte Los Andes (VE) · plan Flota · activa    |
| `conductor@losandes.dev`    | conductor  | Solo ve el bus ABC-123                             |
| `owner@rutasnorte.dev`      | dueño      | Rutas del Norte (CO) · plan Pro · prueba gratis    |
| `owner@expresostachira.dev` | dueño      | Expresos Táchira (VE) · plan Básico · en gracia    |
| `owner@cootransnorte.dev`   | dueño      | Cootransnorte (CO) · vencida (pantalla de bloqueo) |

Dispositivos: `RS-000001` … `RS-000006` con secretos `dev-secret-1` … `dev-secret-6`
(`RS-000005` deshabilitado por alquiler impago, `RS-000006` en inventario).

## Comandos

| Comando          | Qué hace                                                 |
| ---------------- | -------------------------------------------------------- |
| `pnpm dev`       | App web en modo desarrollo                               |
| `pnpm build`     | Build de producción                                      |
| `pnpm test`      | Tests unitarios (Vitest): suscripciones, API, reportes…  |
| `pnpm db:test`   | Tests de RLS y funciones SQL contra la base local        |
| `pnpm lint`      | ESLint                                                   |
| `pnpm typecheck` | TypeScript                                               |
| `pnpm format`    | Prettier                                                 |
| `pnpm simulate`  | Simulador de dispositivo (`-- --help` para ver opciones) |

## Funcionalidades del MVP

- **API de dispositivos** (`/api/device/events|heartbeat|config`): autenticación por serial +
  secreto (sha256), lotes de 500 eventos con inserción idempotente, rate limiting, OTA con signed
  URLs. Contrato completo en [`firmware/README.md`](firmware/README.md).
- **Panel admin** (`/admin`): resumen e ingreso mensual estimado, organizaciones y sus usuarios,
  buses, dispositivos (secreto mostrado una sola vez), planes y funciones, suscripciones con
  cálculo de precio (descuento por flota, pago anual), pagos manuales que extienden el período,
  firmware OTA.
- **Portal cliente** (`/app`, mobile first): pasajeros de hoy con comparativas, detalle por bus y
  por hora, reportes con descarga **Excel/CSV**, vista de flota, invitación de conductores con buses
  asignados, suscripción e instrucciones de pago.
- **Suscripciones**: estados `trialing → active → grace → expired/canceled`, banner en gracia,
  bloqueo del panel al vencer (los conteos se siguen recibiendo), funciones por plan
  (`plans.features`) mostradas como "Disponible en plan Pro/Flota", límite de buses por suscripción.
- **Cron diario** (`/api/cron/daily`): actualiza estados y genera alertas (equipo sin conexión
  > 24 h, exceso de cruces del conductor, suscripción vencida).
- **Seguridad**: RLS en todas las tablas; el dispositivo nunca habla con la base; la service role
  key solo se usa en el servidor.

Más detalle en [`docs/arquitectura.md`](docs/arquitectura.md) y
[`docs/despliegue.md`](docs/despliegue.md).
