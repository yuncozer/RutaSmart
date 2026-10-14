import { Field, Input } from "@/components/ui/input";

export function BusCreateFields() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label="Placa" htmlFor="plate">
        <Input id="plate" name="plate" required placeholder="ABC-123" className="uppercase" />
      </Field>
      <Field label="Alias" htmlFor="alias">
        <Input id="alias" name="alias" placeholder="Unidad 03" />
      </Field>
      <Field label="Ruta" htmlFor="route_name">
        <Input id="route_name" name="route_name" placeholder="Centro – Terminal" />
      </Field>
    </div>
  );
}
