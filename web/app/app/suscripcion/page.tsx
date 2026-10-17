import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { METHOD_LABELS, MODALITY_LABELS, SubscriptionBadge } from "@/components/status-badges";
import { PaymentInstructions } from "@/components/app/subscription-gate";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { calculatePrice, computeSubscriptionStatus, effectiveEnd } from "@/lib/subscription";
import { formatDate, formatUsd } from "@/lib/format";
import { FEATURE_LABELS, BOOLEAN_FEATURES, PLAN_NAMES } from "@/lib/plans";
import type { Payment, Plan, Subscription } from "@/lib/types";
import { Check, X } from "lucide-react";

export const metadata = { title: "Suscripción" };

export default async function SubscriptionPage() {
  const ctx = await requireOwner();
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("*, plan:plans(*)")
    .eq("organization_id", ctx.org.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sub = data as (Subscription & { plan: Plan }) | null;
  const [{ data: payments }, { count: busCount }] = await Promise.all([
    sub
      ? supabase
          .from("payments")
          .select("*")
          .eq("subscription_id", sub.id)
          .order("paid_at", { ascending: false })
      : Promise.resolve({ data: [] as Payment[] }),
    supabase
      .from("buses")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.org.id)
      .eq("is_active", true),
  ]);
  const tz = { country: ctx.org.country, timezone: ctx.org.timezone };

  if (!sub) {
    return (
      <>
        <PageHeader eyebrow="Tu cuenta" title="Suscripción" />
        <p className="text-muted-foreground">Tu organización no tiene suscripción. Contáctanos.</p>
      </>
    );
  }

  const price = calculatePrice({
    monthlyPricePerBus: Number(sub.plan.monthly_price_usd),
    busQuantity: sub.bus_quantity,
    billingCycle: sub.billing_cycle,
    fleetDiscountPct: Number(sub.fleet_discount_pct),
    annualFreeMonths: sub.annual_free_months,
  });

  return (
    <>
      <PageHeader eyebrow="Tu cuenta" title="Suscripción" description={ctx.org.name} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle className="text-xl">Plan {PLAN_NAMES[sub.plan.code]}</CardTitle>
              <p className="text-muted-foreground text-sm">
                {MODALITY_LABELS[sub.modality]} del equipo · pago{" "}
                {sub.billing_cycle === "annual" ? "anual" : "mensual"}
              </p>
            </div>
            <SubscriptionBadge status={computeSubscriptionStatus(sub)} />
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground text-xs">
                {sub.billing_cycle === "annual" ? "Monto anual" : "Monto mensual"}
              </p>
              <p className="text-2xl font-bold">{formatUsd(price.perCycle)}</p>
              {price.discountPct ? (
                <p className="text-success text-xs">
                  Incluye {price.discountPct}% de descuento por flota
                </p>
              ) : null}
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Pagado hasta</p>
              <p className="text-2xl font-bold">{formatDate(effectiveEnd(sub), tz)}</p>
              {sub.trial_ends_at && new Date(sub.trial_ends_at) > new Date() ? (
                <p className="text-muted-foreground text-xs">
                  Prueba gratis hasta {formatDate(sub.trial_ends_at, tz)}
                </p>
              ) : null}
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Buses cubiertos</p>
              <p className="text-2xl font-bold">
                {busCount ?? 0} / {sub.bus_quantity}
              </p>
            </div>
            <div className="sm:col-span-3">
              <p className="mb-2 text-sm font-medium">Incluye</p>
              <ul className="grid gap-1 text-sm sm:grid-cols-2">
                {BOOLEAN_FEATURES.map((k) => (
                  <li
                    key={k}
                    className={`flex items-center gap-2 ${sub.plan.features[k] ? "" : "text-muted-foreground line-through"}`}
                  >
                    {sub.plan.features[k] ? (
                      <Check className="text-success size-4" />
                    ) : (
                      <X className="size-4" />
                    )}
                    {FEATURE_LABELS[k]}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cómo pagar</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentInstructions orgName={ctx.org.name} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Historial de pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {payments?.length ? (
            <Table>
              <THead>
                <tr>
                  <TH>Fecha</TH>
                  <TH>Monto</TH>
                  <TH>Método</TH>
                  <TH>Referencia</TH>
                  <TH>Meses</TH>
                </tr>
              </THead>
              <TBody>
                {(payments as Payment[]).map((p) => (
                  <tr key={p.id}>
                    <TD>{formatDate(p.paid_at, tz)}</TD>
                    <TD className="font-medium">{formatUsd(p.amount_usd)}</TD>
                    <TD>{METHOD_LABELS[p.method]}</TD>
                    <TD className="font-mono text-xs">{p.reference ?? "—"}</TD>
                    <TD>{p.period_months}</TD>
                  </tr>
                ))}
              </TBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">Aún no hay pagos registrados.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
