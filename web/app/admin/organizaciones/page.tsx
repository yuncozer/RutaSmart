import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { ActionForm } from "@/components/action-form";
import { OrgFields } from "@/components/admin/org-fields";
import { SubscriptionBadge } from "@/components/status-badges";
import { createClient } from "@/lib/supabase/server";
import { computeSubscriptionStatus } from "@/lib/subscription";
import { PLAN_NAMES } from "@/lib/plans";
import type { PlanCode } from "@/lib/types";
import { createOrganization } from "../actions";

export const metadata = { title: "Organizaciones" };

interface Row {
  id: string;
  name: string;
  country: string;
  contact_phone: string | null;
  buses: { count: number }[];
  subscriptions: {
    status: string;
    trial_ends_at: string | null;
    current_period_end: string | null;
    grace_days: number;
    bus_quantity: number;
    plan: { code: PlanCode } | null;
  }[];
}

export default async function OrganizationsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select(
      "id, name, country, contact_phone, buses(count), subscriptions(status, trial_ends_at, current_period_end, grace_days, bus_quantity, plan:plans(code))",
    )
    .order("name");
  const orgs = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageHeader title="Organizaciones" description="Clientes de RutaSmart." />

      <details className="bg-card group mb-6 rounded-2xl border">
        <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-medium">
          <Plus className="size-4" /> Nueva organización
        </summary>
        <div className="border-t p-4">
          <ActionForm
            action={createOrganization}
            submitLabel="Crear organización"
            submitClassName="sm:w-fit"
          >
            <OrgFields />
          </ActionForm>
        </div>
      </details>

      <Card>
        <CardHeader>
          <CardTitle>{orgs.length} organizaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {orgs.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Aún no hay organizaciones"
              description="Crea la primera con el formulario de arriba."
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Nombre</TH>
                  <TH>País</TH>
                  <TH>Buses</TH>
                  <TH>Plan</TH>
                  <TH>Suscripción</TH>
                </tr>
              </THead>
              <TBody>
                {orgs.map((o) => {
                  const sub =
                    o.subscriptions.find((s) => s.status !== "canceled") ??
                    o.subscriptions[0] ??
                    null;
                  return (
                    <tr key={o.id} className="hover:bg-muted/50">
                      <TD>
                        <Link
                          href={`/admin/organizaciones/${o.id}`}
                          className="text-link font-medium hover:underline"
                        >
                          {o.name}
                        </Link>
                        <span className="text-muted-foreground block text-xs">
                          {o.contact_phone}
                        </span>
                      </TD>
                      <TD>{o.country === "VE" ? "🇻🇪 VE" : "🇨🇴 CO"}</TD>
                      <TD>
                        {o.buses[0]?.count ?? 0}
                        {sub ? (
                          <span className="text-muted-foreground"> / {sub.bus_quantity}</span>
                        ) : null}
                      </TD>
                      <TD>{sub?.plan ? PLAN_NAMES[sub.plan.code] : "—"}</TD>
                      <TD>
                        <SubscriptionBadge status={computeSubscriptionStatus(sub)} />
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
