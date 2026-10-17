# Despliegue (Fase 6)

## 1. Supabase en la nube

1. Crea un proyecto en [supabase.com](https://supabase.com) (región sugerida: `us-east-1`, la más
   cercana a Venezuela/Colombia).
2. Vincula y aplica las migraciones desde tu máquina:

   ```bash
   pnpm exec supabase login
   pnpm exec supabase link --project-ref <ref-del-proyecto>
   pnpm exec supabase db push        # aplica supabase/migrations/*
   ```

   **No** cargues `seed.sql` en producción (tiene usuarios y secretos de desarrollo).

3. Crea el superadmin:
   - Authentication → Users → _Add user_ (correo + contraseña, marcar "Auto confirm").
   - SQL Editor: `update public.profiles set is_superadmin = true where id = '<uuid del usuario>';`
   - En producción los planes no existen todavía: créalos con el SQL de la sección "Planes" de
     `supabase/seed.sql` (solo ese bloque) y ajusta precios luego desde `/admin/planes`.
4. Authentication → URL Configuration:
   - Site URL: `https://<tu-dominio>`
   - Redirect URLs: `https://<tu-dominio>/**`
5. Copia de Project Settings → API: la URL, la `anon` key y la `service_role` key.

## 2. Vercel

1. Importa el repositorio de GitHub en Vercel.
2. **Root Directory: `web`** (framework Next.js; Vercel detecta pnpm).
3. Variables de entorno (Production y Preview):

   | Variable                        | Valor                                           |
   | ------------------------------- | ----------------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`      | URL del proyecto Supabase                       |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key                                        |
   | `SUPABASE_SERVICE_ROLE_KEY`     | service_role key (**solo servidor**)            |
   | `NEXT_PUBLIC_APP_NAME`          | `RutaSmart`                                     |
   | `NEXT_PUBLIC_SITE_URL`          | `https://<tu-dominio>`                          |
   | `NEXT_PUBLIC_WHATSAPP_NUMBER`   | número de soporte sin `+` (ej. `584141234567`)  |
   | `CRON_SECRET`                   | cadena aleatoria larga (`openssl rand -hex 32`) |
   | `DEVICE_RATE_LIMIT_PER_MIN`     | `60`                                            |
   | `NEXT_PUBLIC_MAP_TILE_URL`      | (opcional) mapas base con API key, ver abajo    |

4. El cron diario está en `web/vercel.json` (`/api/cron/daily` a las 09:00 UTC ≈ 5:00 am en
   Caracas). Vercel envía `Authorization: Bearer $CRON_SECRET` automáticamente.

## 3. Prueba de punta a punta

1. En `/admin/organizaciones` crea una organización, un bus y un usuario dueño.
2. En `/admin/suscripciones` crea su suscripción.
3. En `/admin/dispositivos` registra un dispositivo (copia el secreto) y asígnalo al bus.
4. Corre el simulador contra producción:

   ```bash
   pnpm simulate -- --api-url https://<tu-dominio> --serial RS-000001 --secret <secreto> --days 2 --offline
   ```

5. Ingresa como el dueño y verifica los conteos en `/app`.

## 4. Mapas

Por defecto se usan los mapas de OpenStreetMap (sin API key, con atribución). Su política de uso
no admite tráfico comercial alto: cuando haya muchos clientes, crea una cuenta en MapTiler o
Stadia Maps y define, por ejemplo:

```
NEXT_PUBLIC_MAP_TILE_URL=https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=<tu-key>
```

## 5. Pendientes / mejoras conocidas

- El rate limiting es en memoria por instancia; para un límite estricto usar Upstash Redis.
- Los correos de Supabase Auth (recuperar contraseña) usan el SMTP por defecto de Supabase, con
  límite bajo de envíos: configura un SMTP propio (Resend, SES…) antes de lanzar.
