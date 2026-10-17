import Link from "next/link";
import { CreditCard } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { ActionForm } from "@/components/action-form";
import { PaymentFields } from "@/components/admin/payment-fields";
import { METHOD_LABELS } from "@/components/status-badges";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatUsd } from "@/lib/format";
import type { Payment } from "@/lib/types";
import { registerPayment } from "../actions";

export const metadata = { title: "Pagos" };

type Row = Payment & { subscription: { id: string; organization: { name: string } } };

export default async function PaymentsPage() {
  const supabase = await createClient();
  const [{ data }, { data: subs }] = await Promise.all([
    supabase
      .from("payments")
      .select("*, subscription:subscriptions(id, organization:organizations(name))")
      .order("paid_at", { ascending: false })
      .limit(100),
    supabase
      .from("subscriptions")
      .select("id, organization:organizations(name)")
      .neq("status", "canceled"),
  ]);
  const payments = (data ?? []) as unknown as Row[];
  const subOptions = (
    (subs ?? []) as unknown as { id: string; organization: { name: string } }[]
  ).sort((a, b) => a.organization.name.localeCompare(b.organization.name));
  const total30 = payments
    .filter((p) => Date.now() - new Date(p.paid_at).getTime() < 30 * 86400_000)
    .reduce((acc, p) => acc + Number(p.amount_usd), 0);

  return (
    <>
      <PageHeader
        eyebrow="Cobros"
        title="Pagos"
        description={`Registro manual (pago móvil, Zelle, Binance, transferencia, efectivo). Últimos 30 días: ${formatUsd(total30)}.`}
      />
      <Card className="mb-6">
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
            <Field label="Suscripción" htmlFor="subscription_id">
              <Select id="subscription_id" name="subscription_id" required defaultValue="">
                <option value="" disabled>
                  Selecciona la organización…
                </option>
                {subOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.organization.name}
                  </option>
                ))}
              </Select>
            </Field>
            <PaymentFields />
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimos pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <EmptyState icon={CreditCard} title="Sin pagos registrados" />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Fecha</TH>
                  <TH>Organización</TH>
                  <TH>Monto</TH>
                  <TH>Método</TH>
                  <TH>Referencia</TH>
                  <TH>Meses</TH>
                </tr>
              </THead>
              <TBody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <TD>{formatDate(p.paid_at)}</TD>
                    <TD>
                      <Link
                        href={`/admin/suscripciones/${p.subscription.id}`}
                        className="text-link hover:underline"
                      >
                        {p.subscription.organization.name}
                      </Link>
                    </TD>
                    <TD className="font-medium">{formatUsd(p.amount_usd)}</TD>
                    <TD>{METHOD_LABELS[p.method]}</TD>
                    <TD className="font-mono text-xs">{p.reference ?? "—"}</TD>
                    <TD>{p.period_months}</TD>
                  </tr>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
