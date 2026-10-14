import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { ActionButton, ActionForm } from "@/components/action-form";
import { SubscriptionFields } from "@/components/admin/subscription-fields";
import { PaymentFields } from "@/components/admin/payment-fields";
import { METHOD_LABELS, MODALITY_LABELS, SubscriptionBadge } from "@/components/status-badges";
import { createClient } from "@/lib/supabase/server";
import {
  calculatePrice,
  computeSubscriptionStatus,
  effectiveEnd,
  FLEET_DISCOUNT_MIN_BUSES,
} from "@/lib/subscription";
import { formatDate, formatUsd } from "@/lib/format";
import { PLAN_NAMES } from "@/lib/plans";
import type { Payment, Plan, Subscription } from "@/lib/types";
import { registerPayment, setSubscriptionCanceled, updateSubscription } from "../../actions";

type Row = Subscription & {
  plan: Plan;
  organization: { id: string; name: string; country: "VE" | "CO"; timezone: string };
};

export default async function SubscriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data }, { data: plans }, { data: payments }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("*, plan:plans(*), organization:organizations(id, name, country, timezone)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("plans").select("*").order("monthly_price_usd"),
    supabase
      .from("payments")
      .select("*")
      .eq("subscription_id", id)
      .order("paid_at", { ascending: false }),
  ]);
  if (!data) notFound();
  const sub = data as unknown as Row;
  const status = computeSubscriptionStatus(sub);
  const tz = { country: sub.organization.country, timezone: sub.organization.timezone };
  const price = calculatePrice({
    monthlyPricePerBus: Number(sub.plan.monthly_price_usd),
    busQuantity: sub.bus_quantity,
    billingCycle: sub.billing_cycle,
    fleetDiscountPct: Number(sub.fleet_discount_pct),
    annualFreeMonths: sub.annual_free_months,
  });
  const end = effectiveEnd(sub);

  return (
    <>
      <Link
        href="/admin/suscripciones"
        className="text-link mb-3 inline-flex items-center gap-1 text-sm hover:underline"
      >
        <ArrowLeft className="size-4" /> Suscripciones
      </Link>
      <PageHeader
        title={sub.organization.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            Plan {PLAN_NAMES[sub.plan.code]} · {MODALITY_LABELS[sub.modality]} ·{" "}
            <SubscriptionBadge status={status} />
          </span>
        }
        actions={
          <ActionButton
            action={setSubscriptionCanceled}
            fields={{ id: sub.id, cancel: String(sub.status !== "canceled") }}
            variant={sub.status === "canceled" ? "default" : "danger"}
            confirm={
              sub.status === "canceled"
                ? undefined
                : "¿Cancelar la suscripción? El cliente perderá acceso al panel."
            }
          >
            {sub.status === "canceled" ? "Reactivar" : "Cancelar suscripción"}
          </ActionButton>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Facturación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Line label="Precio por bus" value={`${formatUsd(sub.plan.monthly_price_usd)}/mes`} />
            <Line label={`Subtotal (${sub.bus_quantity} buses)`} value={formatUsd(price.gross)} />
            <Line
              label="Descuento flota"
              value={
                price.discountPct
                  ? `−${price.discountPct}%`
                  : `No aplica (< ${FLEET_DISCOUNT_MIN_BUSES} buses)`
              }
            />
            <Line label="Mensual" value={formatUsd(price.monthly)} strong />
            <Line
              label={`Anual (${12 - sub.annual_free_months} meses)`}
              value={formatUsd(price.annual)}
            />
            <hr className="my-2" />
            <Line label="Inicio" value={formatDate(sub.started_at, tz)} />
            {sub.trial_ends_at ? (
              <Line label="Fin de prueba gratis" value={formatDate(sub.trial_ends_at, tz)} />
            ) : null}
            <Line label="Pagado hasta" value={formatDate(end, tz)} strong />
            {sub.deposit_usd ? <Line label="Depósito" value={formatUsd(sub.deposit_usd)} /> : null}
            {sub.min_contract_months ? (
              <Line label="Contrato mínimo" value={`${sub.min_contract_months} meses`} />
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Registrar pago</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm
              action={registerPayment}
              submitLabel="Registrar pago"
              resetOnSuccess
              submitClassName="sm:w-fit"
            >
              <input type="hidden" name="subscription_id" value={sub.id} />
              <PaymentFields defaultAmount={price.perCycle} defaultMonths={price.periodMonths} />
              <p className="text-muted-foreground text-xs">
                Al registrar, el período se extiende desde{" "}
                {end && end > new Date() ? "la fecha de corte actual" : "hoy"}.
              </p>
            </ActionForm>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Editar suscripción</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={updateSubscription} submitClassName="sm:w-fit">
            <input type="hidden" name="id" value={sub.id} />
            <Field
              label="Pagado hasta (ajuste manual)"
              htmlFor="current_period_end"
              className="sm:w-64"
            >
              <Input
                id="current_period_end"
                name="current_period_end"
                type="date"
                defaultValue={sub.current_period_end?.slice(0, 10)}
                required
              />
            </Field>
            <SubscriptionFields plans={(plans ?? []) as Plan[]} sub={sub} />
          </ActionForm>
        </CardContent>
      </Card>

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
            <p className="text-muted-foreground text-sm">Sin pagos registrados.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function Line({
  label,
  value,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold" : undefined}>{value}</span>
    </div>
  );
}
