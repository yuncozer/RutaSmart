# Firmware RutaSmart RU7 (ESP32-S3) — Contrato de API

> El firmware se desarrolla en la **Fase 7** (PlatformIO, ESP-IDF o Arduino).
> Este documento es el contrato que debe cumplir. El simulador (`tools/simulator`) lo implementa
> en TypeScript y sirve como referencia.

## Autenticación

Cada request lleva:

```
X-Device-Serial: RS-000123
Authorization: Bearer <device_secret>
Content-Type: application/json
```

- El secreto se genera en el panel admin al registrar el dispositivo y **se muestra una sola vez**.
  Se guarda en la NVS del ESP32 (idealmente cifrada).
- El servidor compara `sha256(secreto)` con `devices.secret_hash`.
- Límite: 60 requests/minuto por serial (configurable). Si recibe `429`, respetar `Retry-After`.

| Código        | Significado                              | Qué hace el firmware                                  |
| ------------- | ---------------------------------------- | ----------------------------------------------------- |
| 200           | OK                                       | —                                                     |
| 400           | Cuerpo inválido                          | Descartar el lote (bug), registrar en log             |
| 401           | Credenciales inválidas o equipo retirado | Dejar de sincronizar; reintentar cada hora            |
| 403           | `device_disabled`                        | Conservar la cola; consultar `/config` periódicamente |
| 409           | `device_not_assigned`                    | Conservar la cola; reintentar más tarde               |
| 429           | Rate limit                               | Esperar `Retry-After`                                 |
| 5xx / sin red | Error temporal                           | Reintentar con backoff exponencial (2s, 4s, 8s, 16s…) |

## `POST /api/device/events`

Lote de hasta **500 eventos**. Cada evento tiene un **UUID v4 generado por el dispositivo**
en el momento del conteo, y se guarda en la microSD hasta que el servidor lo confirme.

```json
{
  "events": [
    {
      "id": "8f1c2b0e-4a7d-4c1e-9f0a-3b2c1d0e9f8a",
      "occurred_at": "2026-10-14T12:15:03Z",
      "direction": "in",
      "is_driver": false,
      "confidence": 0.91,
      "lat": 7.7669,
      "lng": -72.225
    }
  ]
}
```

- `occurred_at`: ISO 8601 en UTC (hora de RTC/GPS/NTP). Se rechazan eventos con más de 10 min en
  el futuro o más de 90 días de antigüedad.
- `direction`: `in` (sube) o `out` (baja).
- `is_driver`: `true` si el cruce es del conductor (se excluye de los totales y se audita aparte).
- `confidence`, `lat`, `lng`: opcionales.

Respuesta:

```json
{
  "accepted": 120,
  "duplicates": 3,
  "rejected": [{ "index": 7, "id": "…", "reason": "invalid_event" }]
}
```

La inserción es **idempotente** (`ON CONFLICT (id) DO NOTHING`): reenviar un evento ya recibido no
lo duplica. Con un `200`, el firmware borra de la cola **todos** los eventos del lote
(aceptados, duplicados y rechazados).

## `POST /api/device/positions` (GPS)

Recorrido del bus. El equipo toma un punto GPS cada `gps_interval_s` segundos (lo indica
`/config`; por defecto 15 s) mientras tenga _fix_, lo guarda en la microSD con un **UUID propio**
y lo envía en lotes de hasta **1000 puntos**, igual que los eventos.

```json
{
  "positions": [
    {
      "id": "3b7e9a52-1c4d-4f6a-9e21-7d0c5b8a4f13",
      "recorded_at": "2026-10-14T12:15:00Z",
      "lat": 7.7669,
      "lng": -72.225,
      "speed_kmh": 28.5,
      "heading": 90,
      "accuracy_m": 4.2,
      "satellites": 9
    }
  ]
}
```

- `lat`, `lng` y `recorded_at` son obligatorios; el resto es opcional (salida NMEA del NEO-M8N).
- `heading`: rumbo en grados (0–359). `accuracy_m`: precisión estimada (HDOP × ~5 m).
- Puntos en `0,0` se rechazan con `no_fix` (lo que reportan muchos módulos sin señal).
- Respuesta e idempotencia iguales a `/events`: `{ "accepted", "duplicates", "rejected" }`.
- El punto más reciente del lote se guarda como la **última ubicación** del bus (mapa en vivo).
- Los eventos de conteo también deben llevar `lat`/`lng` del último _fix_ para ubicar cada subida.

## `POST /api/device/heartbeat`

```json
{
  "battery": 87,
  "rssi": -67,
  "free_storage_mb": 12000,
  "firmware_version": "0.1.0",
  "model_version": "m-0.1",
  "lat": 7.76,
  "lng": -72.22
}
```

Respuesta: `{ "ok": true, "server_time": "2026-10-14T12:20:00.000Z" }` (útil para corregir el RTC).

## `GET /api/device/config`

```json
{
  "enabled": true,
  "assigned": true,
  "server_time": "2026-10-14T12:20:00Z",
  "sync_interval_s": 300,
  "gps_interval_s": 15,
  "driver_exclusion_enabled": false,
  "firmware": {
    "update_available": true,
    "version": "0.2.0",
    "url": "https://…signed",
    "sha256": "…"
  }
}
```

- `enabled: false` → el equipo está deshabilitado (p. ej. alquiler impago): seguir contando y
  guardando en la cola, pero no enviar eventos.
- `firmware.url` es una signed URL temporal (1 h) de Supabase Storage. Verificar el `sha256` del
  binario descargado antes de aplicar la OTA.

## Ciclo recomendado

1. Al encender: conectar WiFi (portal cautivo "RutaSmart-XXXX" si no hay credenciales), `GET /config`.
2. Cada conteo: guardar el evento con UUID y hora en la microSD.
3. Cada `gps_interval_s`: guardar un punto GPS en la cola (si hay _fix_).
4. Cada `sync_interval_s`: enviar eventos (lotes de 500) y posiciones (lotes de 1000) → borrar lo
   confirmado → heartbeat.
5. Cada hora: `GET /config` → aplicar OTA si hay versión nueva.
