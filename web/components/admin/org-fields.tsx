import { Field, Input, Select } from "@/components/ui/input";
import type { Organization } from "@/lib/types";

/** Campos del formulario de organización (crear / editar). */
export function OrgFields({ org }: { org?: Organization }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {org ? <input type="hidden" name="id" value={org.id} /> : null}
      <Field label="Nombre" htmlFor="name" className="sm:col-span-2">
        <Input
          id="name"
          name="name"
          required
          defaultValue={org?.name}
          placeholder="Transporte Ejemplo C.A."
        />
      </Field>
      <Field label="País" htmlFor="country" hint="Define zona horaria y formato de números">
        <Select id="country" name="country" defaultValue={org?.country ?? "VE"}>
          <option value="VE">Venezuela (America/Caracas)</option>
          <option value="CO">Colombia (America/Bogota)</option>
        </Select>
      </Field>
      <Field label="RIF / NIT" htmlFor="tax_id">
        <Input id="tax_id" name="tax_id" defaultValue={org?.tax_id ?? ""} />
      </Field>
      <Field label="Teléfono / WhatsApp" htmlFor="contact_phone">
        <Input id="contact_phone" name="contact_phone" defaultValue={org?.contact_phone ?? ""} />
      </Field>
      <Field label="Correo de contacto" htmlFor="contact_email">
        <Input
          id="contact_email"
          name="contact_email"
          type="email"
          defaultValue={org?.contact_email ?? ""}
        />
      </Field>
    </div>
  );
}
