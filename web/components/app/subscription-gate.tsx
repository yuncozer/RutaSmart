import Link from "next/link";
import { AlertTriangle, Lock, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PAYMENT_METHODS, whatsappLink } from "@/lib/payment-info";
import { formatDate } from "@/lib/format";
import { daysUntil, effectiveEnd } from "@/lib/subscription";
import { upgradeLabel } from "@/lib/plans";
import type { AppContext } from "@/lib/auth";
import type { PlanFeatures } from "@/lib/types";

export function PaymentInstructions({ orgName }: { orgName: string }) {
  const wa = whatsappLink(`Hola, adjunto el comprobante de pago de RutaSmart RU7 para ${orgName}.`);
  return (
    <div className="space-y-3">
      <ul className="space-y-2 text-sm">
        {PAYMENT_METHODS.map((m) => (
          <li key={m.name} className="rounded-lg border p-3">
            <p className="font-medium">{m.name}</p>
            <p className="text-muted-foreground">{m.detail}</p>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-sm">
        Envía el comprobante y activaremos tu suscripción el mismo día.
      </p>
      {wa ? (
        <a href={wa} className={buttonVariants({ variant: "accent" })}>
          <MessageCircle /> Enviar comprobante por WhatsApp
        </a>
      ) : null}
    </div>
  );
}

/** Banner en período de gracia (y aviso de fin de prueba cercano). */
export function SubscriptionBanner({ ctx }: { ctx: AppContext }) {
  const { access } = ctx;
  const end = effectiveEnd({
    status: access.status,
    trial_ends_at: access.trial_ends_at ?? null,
    current_period_end: access.current_period_end ?? null,
    grace_days: access.grace_days ?? 7,
  });
  const tz = { country: ctx.org.country, timezone: ctx.org.timezone };

  if (access.status === "grace") {
    const blockDate = end ? new Date(end.getTime() + (access.grace_days ?? 7) * 86400_000) : null;
    return (
      <div className="border-accent/40 bg-accent/15 dark:text-accent flex items-start gap-3 border-b px-4 py-3 text-sm text-amber-900 lg:px-8">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <p>
          Tu suscripción venció el {formatDate(end, tz)}. El acceso se bloqueará el{" "}
          <strong>{formatDate(blockDate, tz)}</strong>.{" "}
          {ctx.role === "owner" ? (
            <Link href="/app/suscripcion" className="font-medium underline">
              Ver cómo pagar
            </Link>
          ) : (
            "Avisa al dueño de la empresa."
          )}
        </p>
      </div>
    );
  }

  const left = daysUntil(end);
  if (
    (access.status === "trialing" || access.status === "active") &&
    left !== null &&
    left <= 5 &&
    ctx.role === "owner"
  ) {
    return (
      <div className="bg-navy-100/70 text-navy-900 dark:bg-navy-800 dark:text-navy-100 border-b px-4 py-2 text-sm lg:px-8">
        {access.status === "trialing" ? "Tu prueba gratis" : "Tu suscripción"} vence en {left} día
        {left === 1 ? "" : "s"} ({formatDate(end, tz)}).{" "}
        <Link href="/app/suscripcion" className="font-medium underline">
          Renovar
        </Link>
      </div>
    );
  }
  return null;
}

/** Pantalla de bloqueo: suscripción vencida, cancelada o inexistente. */
export function SubscriptionBlocked({ ctx }: { ctx: AppContext }) {
  const titles = {
    expired: "Tu suscripción está vencida",
    canceled: "Tu suscripción fue cancelada",
    none: "Tu organización no tiene una suscripción activa",
  } as Record<string, string>;
  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader className="items-center text-center">
          <div className="bg-danger/10 mb-2 grid size-14 place-items-center rounded-full">
            <Lock className="text-danger size-7" />
          </div>
          <CardTitle className="text-xl">{titles[ctx.access.status] ?? titles.none}</CardTitle>
          <p className="text-muted-foreground text-sm">
            Tus equipos siguen contando pasajeros y los datos se guardan. Para ver el panel y los
            reportes, renueva tu suscripción.
          </p>
        </CardHeader>
        <CardContent>
          {ctx.role === "owner" ? (
            <PaymentInstructions orgName={ctx.org.name} />
          ) : (
            <p className="text-muted-foreground text-center text-sm">
              Avisa al dueño de la empresa para renovarla.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Bloque deshabilitado para funciones que no incluye el plan. */
export function FeatureLocked({ feature, title }: { feature: keyof PlanFeatures; title: string }) {
  return (
    <div className="bg-muted/40 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-10 text-center">
      <Lock className="text-navy-300 size-6" />
      <p className="text-muted-foreground font-medium">{title}</p>
      <p className="text-muted-foreground text-sm">{upgradeLabel(feature)}</p>
    </div>
  );
}
