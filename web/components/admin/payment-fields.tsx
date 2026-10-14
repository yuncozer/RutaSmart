import { Field, Input, Select } from "@/components/ui/input";
import { METHOD_LABELS } from "@/components/status-badges";

export function PaymentFields({
  defaultAmount,
  defaultMonths = 1,
}: {
  defaultAmount?: number;
  defaultMonths?: number;
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label="Monto (USD)" htmlFor="amount_usd">
        <Input
          id="amount_usd"
          name="amount_usd"
          type="number"
          step="0.01"
          min="0.01"
          defaultValue={defaultAmount}
          required
        />
      </Field>
      <Field label="Método" htmlFor="method">
        <Select id="method" name="method" defaultValue="pago_movil">
          {Object.entries(METHOD_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Meses que cubre" htmlFor="period_months">
        <Input
          id="period_months"
          name="period_months"
          type="number"
          min="1"
          max="24"
          defaultValue={defaultMonths}
          required
        />
      </Field>
      <Field label="Referencia" htmlFor="reference">
        <Input id="reference" name="reference" placeholder="N.º de operación" />
      </Field>
      <Field label="Fecha de pago" htmlFor="paid_at">
        <Input id="paid_at" name="paid_at" type="date" defaultValue={today} required />
      </Field>
      <Field label="Notas" htmlFor="pay_notes">
        <Input id="pay_notes" name="notes" />
      </Field>
    </div>
  );
}
