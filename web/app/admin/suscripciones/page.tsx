import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { ActionForm } from "@/components/action-form";
import { SubscriptionFields } from "@/components/admin/subscription-fields";
import { MODALITY_LABELS, SubscriptionBadge } from "@/components/status-badges";
import { createClient } from "@/lib/supabase/server";
import { calculatePrice, computeSubscriptionStatus, STATUS_LABELS } from "@/lib/subscription";
import { formatDate, formatUsd } from "@/lib/format";
import { PLAN_NAMES } from "@/lib/plans";
import type { Plan, Subscription, SubscriptionStatus } from "@/lib/types";
import { createSubscription } from "../actions";

export const metadata = { title: "Suscripciones" };

type Row = Subscription & {
  plan: Plan;
  organization: { id: string; name: string; country: "VE" | "CO" };
};

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; nueva?: string }>;
}) {
  const { estado, nueva } = await searchParams;
  const supabase = await createClient();
  const [{ data }, { data: plans }, { data: orgs }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("*, plan:plans(*), organization:organizations(id, name, country)")
      .order("created_at", { ascending: false }),
    supabase.from("plans").select("*").order("monthly_price_usd"),
    supabase.from("organizations").select("id, name").order("name"),
  ]);

  const rows = ((data ?? []) as unknown as Row[])
    .map((s) => ({ ...s, live: computeSubscriptionStatus(s) }))
    .filter((s) => !estado || s.live === estado);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        eyebrow="Cobros"
        title="Suscripciones"
        description="Una suscripción activa por organización."
      />

      <details className="bg-card mb-6 rounded-2xl border" open={Boolean(nueva)}>
        <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-medium">
          <Plus className="size-4" /> Nueva suscripción
        </summary>
        <div className="border-t p-4">
          <ActionForm
            action={createSubscription}
            submitLabel="Crear suscripción"
            submitClassName="sm:w-fit"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Organización" htmlFor="organization_id">
                <Select
                  id="organization_id"
                  name="organization_id"
                  defaultValue={nueva ?? ""}
                  required
                >
                  <option value="" disabled>
                    Selecciona…
                  </option>
                  {orgs?.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Fecha de inicio" htmlFor="started_at">
                <Input
                  id="started_at"
                  name="started_at"
                  type="date"
                  defaultValue={today}
                  required
                />
              </Field>
            </div>
            <SubscriptionFields plans={(plans ?? []) as Plan[]} />
          </ActionForm>
        </div>
      </details>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["", "trialing", "active", "grace", "expired", "canceled"] as const).map((s) => (
          <a
            key={s}
            href={s ? `?estado=${s}` : "?"}
            className={`rounded-full border px-3 py-1 text-sm ${(estado ?? "") === s ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
          >
            {s ? STATUS_LABELS[s as SubscriptionStatus] : "Todas"}
          </a>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{rows.length} suscripciones</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState icon={Receipt} title="Sin suscripciones" />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Organización</TH>
                  <TH>Plan</TH>
                  <TH>Buses</TH>
                  <TH>Monto</TH>
                  <TH>Vence</TH>
                  <TH>Estado</TH>
                </tr>
              </THead>
              <TBody>
                {rows.map((s) => {
                  const price = calculatePrice({
                    monthlyPricePerBus: Number(s.plan.monthly_price_usd),
                    busQuantity: s.bus_quantity,
                    billingCycle: s.billing_cycle,
                    fleetDiscountPct: Number(s.fleet_discount_pct),
                    annualFreeMonths: s.annual_free_months,
                  });
                  return (
                    <tr key={s.id} className="hover:bg-muted/50">
                      <TD>
                        <Link
                          href={`/admin/suscripciones/${s.id}`}
                          className="text-link font-medium hover:underline"
                        >
                          {s.organization.name}
                        </Link>
                        <span className="text-muted-foreground block text-xs">
                          {MODALITY_LABELS[s.modality]}
                        </span>
                      </TD>
                      <TD>{PLAN_NAMES[s.plan.code]}</TD>
                      <TD>{s.bus_quantity}</TD>
                      <TD>
                        {formatUsd(price.perCycle)}
                        <span className="text-muted-foreground text-xs">
                          /{s.billing_cycle === "annual" ? "año" : "mes"}
                        </span>
                      </TD>
                      <TD>
                        {formatDate(s.current_period_end, { country: s.organization.country })}
                      </TD>
                      <TD>
                        <SubscriptionBadge status={s.live} />
                      </TD>
                    </tr>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
