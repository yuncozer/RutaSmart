# Firmware RutaSmart (ESP32-S3) — Contrato de API

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

| Código | Significado | Qué hace el firmware |
|---|---|---|
| 200 | OK | — |
| 400 | Cuerpo inválido | Descartar el lote (bug), registrar en log |
| 401 | Credenciales inválidas o equipo retirado | Dejar de sincronizar; reintentar cada hora |
| 403 | `device_disabled` | Conservar la cola; consultar `/config` periódicamente |
| 409 | `device_not_assigned` | Conservar la cola; reintentar más tarde |
| 429 | Rate limit | Esperar `Retry-After` |
| 5xx / sin red | Error temporal | Reintentar con backoff exponencial (2s, 4s, 8s, 16s…) |

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
      "lng": -72.2250
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
{ "accepted": 120, "duplicates": 3, "rejected": [{ "index": 7, "id": "…", "reason": "invalid_event" }] }
```

La inserción es **idempotente** (`ON CONFLICT (id) DO NOTHING`): reenviar un evento ya recibido no
lo duplica. Con un `200`, el firmware borra de la cola **todos** los eventos del lote
(aceptados, duplicados y rechazados).

## `POST /api/device/heartbeat`

```json
{ "battery": 87, "rssi": -67, "free_storage_mb": 12000, "firmware_version": "0.1.0", "model_version": "m-0.1", "lat": 7.76, "lng": -72.22 }
```

Respuesta: `{ "ok": true, "server_time": "2026-10-14T12:20:00.000Z" }` (útil para corregir el RTC).

## `GET /api/device/config`

```json
{
  "enabled": true,
  "assigned": true,
  "server_time": "2026-10-14T12:20:00Z",
  "sync_interval_s": 300,
  "driver_exclusion_enabled": false,
  "firmware": { "update_available": true, "version": "0.2.0", "url": "https://…signed", "sha256": "…" }
}
```

- `enabled: false` → el equipo está deshabilitado (p. ej. alquiler impago): seguir contando y
  guardando en la cola, pero no enviar eventos.
- `firmware.url` es una signed URL temporal (1 h) de Supabase Storage. Verificar el `sha256` del
  binario descargado antes de aplicar la OTA.

## Ciclo recomendado

1. Al encender: conectar WiFi (portal cautivo "RutaSmart-XXXX" si no hay credenciales), `GET /config`.
2. Cada conteo: guardar el evento con UUID y hora en la microSD.
3. Cada `sync_interval_s`: enviar la cola en lotes de 500 → borrar lo confirmado → heartbeat.
4. Cada hora: `GET /config` → aplicar OTA si hay versión nueva.
