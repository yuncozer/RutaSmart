import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest) {
  const { cronSecret } = serverEnv();
  if (!cronSecret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${cronSecret}`);
  return got.length === expected.length && timingSafeEqual(got, expected);
}

/**
 * Tarea diaria (Vercel Cron, ver vercel.json):
 *  1. Actualiza el estado guardado de las suscripciones (trialing → active → grace → expired).
 *  2. Genera alertas: equipo sin conexión > 24 h, exceso de cruces del conductor, suscripción vencida.
 * Vercel envía "Authorization: Bearer $CRON_SECRET".
 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const threshold = Number(process.env.DRIVER_EXCLUSION_ALERT_THRESHOLD ?? 20);
  const statuses = await db.rpc("refresh_subscription_statuses");
  if (statuses.error) return NextResponse.json({ error: statuses.error.message }, { status: 500 });
  const alerts = await db.rpc("generate_alerts", { p_driver_threshold: threshold });
  if (alerts.error) return NextResponse.json({ error: alerts.error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    subscriptions_updated: statuses.data,
    alerts_created: alerts.data,
  });
}
