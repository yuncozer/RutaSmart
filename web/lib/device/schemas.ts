import { z } from "zod";

/** Contrato de la API de dispositivos (ver firmware/README.md). */

export const MAX_EVENTS_PER_REQUEST = 500;
/** Tolerancia para relojes adelantados del dispositivo. */
export const MAX_FUTURE_SKEW_MS = 10 * 60 * 1000;
/** No se aceptan eventos más viejos que esto (cola local muy antigua o reloj sin sincronizar). */
export const MAX_EVENT_AGE_MS = 90 * 24 * 60 * 60 * 1000;

export const countEventSchema = z.object({
  id: z.string().uuid(),
  occurred_at: z.string().datetime({ offset: true }),
  direction: z.enum(["in", "out"]),
  is_driver: z.boolean().optional().default(false),
  confidence: z.number().min(0).max(1).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
});
export type CountEventInput = z.infer<typeof countEventSchema>;

export const eventsBodySchema = z.object({
  events: z.array(z.unknown()).min(1).max(MAX_EVENTS_PER_REQUEST),
});

export const MAX_POSITIONS_PER_REQUEST = 1000;

export const positionSchema = z.object({
  id: z.string().uuid(),
  recorded_at: z.string().datetime({ offset: true }),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speed_kmh: z.number().min(0).max(250).nullable().optional(),
  heading: z.number().int().min(0).max(359).nullable().optional(),
  accuracy_m: z.number().min(0).nullable().optional(),
  satellites: z.number().int().min(0).max(64).nullable().optional(),
});
export type PositionInput = z.infer<typeof positionSchema>;

export const positionsBodySchema = z.object({
  positions: z.array(z.unknown()).min(1).max(MAX_POSITIONS_PER_REQUEST),
});

export const heartbeatSchema = z.object({
  battery: z.number().int().min(0).max(100).nullable().optional(),
  rssi: z.number().int().min(-150).max(0).nullable().optional(),
  free_storage_mb: z.number().int().min(0).nullable().optional(),
  firmware_version: z.string().max(32).nullable().optional(),
  model_version: z.string().max(32).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
});
export type HeartbeatInput = z.infer<typeof heartbeatSchema>;

export const serialSchema = z.string().regex(/^RS-\d{6}$/);
