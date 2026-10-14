import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { PLAN_NAMES } from "@/lib/plans";
import { formatUsd } from "@/lib/format";
import type { Plan, Subscription } from "@/lib/types";

/** Campos comunes de suscripción (crear / editar). */
export function SubscriptionFields({ plans, sub }: { plans: Plan[]; sub?: Subscription }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Plan" htmlFor="plan_id">
        <Select
          id="plan_id"
          name="plan_id"
          defaultValue={sub?.plan_id ?? plans.find((p) => p.code === "pro")?.id}
          required
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {PLAN_NAMES[p.code]} · {formatUsd(p.monthly_price_usd)}/bus
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Cantidad de buses" htmlFor="bus_quantity">
        <Input
          id="bus_quantity"
          name="bus_quantity"
          type="number"
          min="1"
          defaultValue={sub?.bus_quantity ?? 1}
          required
        />
      </Field>
      <Field
        label="Modalidad del equipo"
        htmlFor="modality"
        hint="Compra: 3 meses gratis. Alquiler: paga desde el día 1."
      >
        <Select id="modality" name="modality" defaultValue={sub?.modality ?? "purchase"}>
          <option value="purchase">Compra</option>
          <option value="rental">Alquiler</option>
        </Select>
      </Field>
      <Field label="Ciclo de pago" htmlFor="billing_cycle">
        <Select
          id="billing_cycle"
          name="billing_cycle"
          defaultValue={sub?.billing_cycle ?? "monthly"}
        >
          <option value="monthly">Mensual</option>
          <option value="annual">Anual</option>
        </Select>
      </Field>
      <Field label="Días de gracia" htmlFor="grace_days">
        <Input
          id="grace_days"
          name="grace_days"
          type="number"
          min="0"
          max="60"
          defaultValue={sub?.grace_days ?? 7}
        />
      </Field>
      <Field
        label="Descuento flota (%)"
        htmlFor="fleet_discount_pct"
        hint="Aplica con 5 buses o más"
      >
        <Input
          id="fleet_discount_pct"
          name="fleet_discount_pct"
          type="number"
          min="0"
          max="100"
          step="0.5"
          defaultValue={sub?.fleet_discount_pct ?? 10}
        />
      </Field>
      <Field label="Meses gratis por pago anual" htmlFor="annual_free_months">
        <Input
          id="annual_free_months"
          name="annual_free_months"
          type="number"
          min="0"
          max="11"
          defaultValue={sub?.annual_free_months ?? 2}
        />
      </Field>
      <Field label="Depósito (USD, alquiler)" htmlFor="deposit_usd">
        <Input
          id="deposit_usd"
          name="deposit_usd"
          type="number"
          min="0"
          step="0.01"
          defaultValue={sub?.deposit_usd ?? ""}
        />
      </Field>
      <Field label="Contrato mínimo (meses)" htmlFor="min_contract_months">
        <Input
          id="min_contract_months"
          name="min_contract_months"
          type="number"
          min="0"
          defaultValue={sub?.min_contract_months ?? ""}
        />
      </Field>
      <Field label="Notas" htmlFor="notes" className="sm:col-span-2 lg:col-span-3">
        <Textarea id="notes" name="notes" defaultValue={sub?.notes ?? ""} />
      </Field>
    </div>
  );
}
