import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ActionButton, ActionForm } from "@/components/action-form";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Bus } from "@/lib/types";
import { inviteDriver, removeDriver, updateDriverBuses } from "../actions";

export const metadata = { title: "Usuarios" };

interface Member {
  user_id: string;
  full_name: string | null;
  email: string;
  role: "owner" | "driver";
  bus_ids: string[];
}

function BusCheckboxes({
  buses,
  selected = [],
  prefix,
}: {
  buses: Bus[];
  selected?: string[];
  prefix: string;
}) {
  if (!buses.length)
    return <p className="text-muted-foreground text-sm">No hay buses para asignar.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {buses.map((b) => (
        <label
          key={b.id}
          htmlFor={`${prefix}-${b.id}`}
          className="has-[:checked]:border-navy-500 has-[:checked]:bg-navy-100/60 dark:has-[:checked]:bg-navy-800 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
        >
          <input
            id={`${prefix}-${b.id}`}
            type="checkbox"
            name="bus_ids"
            value={b.id}
            defaultChecked={selected.includes(b.id)}
            className="accent-navy-700 size-4"
          />
          {b.plate}
        </label>
      ))}
    </div>
  );
}

export default async function UsersPage() {
  const ctx = await requireOwner();
  const supabase = await createClient();
  const [{ data: members }, { data: buses }] = await Promise.all([
    supabase.rpc("org_members", { p_org_id: ctx.org.id }),
    supabase
      .from("buses")
      .select("*")
      .eq("organization_id", ctx.org.id)
      .eq("is_active", true)
      .order("plate"),
  ]);
  const list = (members ?? []) as Member[];
  const busList = (buses ?? []) as Bus[];
  const maxUsers = ctx.access.features.max_users ?? 1;
  const canAdd = list.length < maxUsers;

  return (
    <>
      <PageHeader
        eyebrow="Tu equipo"
        title="Usuarios"
        description={`${list.length} de ${maxUsers} usuario${maxUsers === 1 ? "" : "s"} de tu plan. Los conductores solo ven los buses asignados.`}
      />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Invitar conductor</CardTitle>
          <CardDescription>
            Se crea su cuenta con una contraseña temporal para que se la compartas (por ejemplo, por
            WhatsApp).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canAdd ? (
            <ActionForm
              action={inviteDriver}
              submitLabel="Invitar conductor"
              resetOnSuccess
              submitClassName="sm:w-fit"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombre" htmlFor="full_name">
                  <Input id="full_name" name="full_name" required />
                </Field>
                <Field label="Correo" htmlFor="email">
                  <Input id="email" name="email" type="email" required />
                </Field>
              </div>
              <Field label="Buses asignados">
                <BusCheckboxes buses={busList} prefix="new" />
              </Field>
            </ActionForm>
          ) : (
            <p className="text-muted-foreground text-sm">
              Alcanzaste el máximo de usuarios de tu plan.{" "}
              {maxUsers < 50 ? "El plan Flota permite múltiples usuarios." : ""}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((m) => (
          <Card key={m.user_id}>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>{m.full_name ?? m.email}</CardTitle>
                <CardDescription>{m.email}</CardDescription>
              </div>
              <Badge variant={m.role === "owner" ? "default" : "muted"}>
                {m.role === "owner" ? "Dueño" : "Conductor"}
              </Badge>
            </CardHeader>
            {m.role === "driver" ? (
              <CardContent className="space-y-3">
                <ActionForm
                  action={updateDriverBuses}
                  submitLabel="Guardar buses"
                  submitVariant="secondary"
                  submitClassName="sm:w-fit"
                >
                  <input type="hidden" name="user_id" value={m.user_id} />
                  <BusCheckboxes buses={busList} selected={m.bus_ids} prefix={m.user_id} />
                </ActionForm>
                <ActionButton
                  action={removeDriver}
                  fields={{ user_id: m.user_id }}
                  variant="ghost"
                  confirm={`¿Quitar a ${m.full_name ?? m.email}? Perderá el acceso.`}
                >
                  Quitar conductor
                </ActionButton>
              </CardContent>
            ) : null}
          </Card>
        ))}
      </div>
    </>
  );
}
