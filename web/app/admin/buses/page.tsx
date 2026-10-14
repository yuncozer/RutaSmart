import Link from "next/link";
import { Bus as BusIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { ActionButton, ActionForm } from "@/components/action-form";
import { BusCreateFields } from "@/components/admin/bus-fields";
import { OnlineDot } from "@/components/status-badges";
import { createClient } from "@/lib/supabase/server";
import { createBus, updateBus } from "../actions";

export const metadata = { title: "Buses" };

interface Row {
  id: string;
  plate: string;
  alias: string | null;
  route_name: string | null;
  is_active: boolean;
  organization: { id: string; name: string } | null;
  devices: { serial: string; last_seen_at: string | null; status: string }[];
}

export default async function BusesPage() {
  const supabase = await createClient();
  const [{ data }, { data: orgs }] = await Promise.all([
    supabase
      .from("buses")
      .select(
        "id, plate, alias, route_name, is_active, organization:organizations(id, name), devices(serial, last_seen_at, status)",
      )
      .order("plate"),
    supabase.from("organizations").select("id, name").order("name"),
  ]);
  const buses = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageHeader title="Buses" description="Todas las unidades registradas." />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Registrar bus</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm
            action={createBus}
            submitLabel="Registrar"
            resetOnSuccess
            submitClassName="sm:w-fit"
          >
            <Field label="Organización" htmlFor="organization_id">
              <Select id="organization_id" name="organization_id" required defaultValue="">
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
            <BusCreateFields />
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{buses.length} buses</CardTitle>
        </CardHeader>
        <CardContent>
          {buses.length === 0 ? (
            <EmptyState icon={BusIcon} title="Sin buses" />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Placa</TH>
                  <TH>Organización</TH>
                  <TH>Ruta</TH>
                  <TH>Dispositivo</TH>
                  <TH>Estado</TH>
                  <TH />
                </tr>
              </THead>
              <TBody>
                {buses.map((b) => (
                  <tr key={b.id}>
                    <TD className="font-medium">
                      {b.plate}
                      <span className="text-muted-foreground block text-xs">{b.alias}</span>
                    </TD>
                    <TD>
                      {b.organization ? (
                        <Link
                          href={`/admin/organizaciones/${b.organization.id}`}
                          className="text-link hover:underline"
                        >
                          {b.organization.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TD>
                    <TD>{b.route_name ?? "—"}</TD>
                    <TD>
                      {b.devices[0] ? (
                        <span className="flex flex-col">
                          <span className="font-mono text-xs">{b.devices[0].serial}</span>
                          <OnlineDot lastSeen={b.devices[0].last_seen_at} />
                        </span>
                      ) : (
                        <Link
                          href="/admin/dispositivos"
                          className="text-link text-xs hover:underline"
                        >
                          Sin equipo · asignar
                        </Link>
                      )}
                    </TD>
                    <TD>
                      {b.is_active ? (
                        <Badge variant="success">Activo</Badge>
                      ) : (
                        <Badge variant="muted">Inactivo</Badge>
                      )}
                    </TD>
                    <TD className="text-right">
                      <ActionButton
                        action={updateBus}
                        fields={{ id: b.id, is_active: String(!b.is_active) }}
                      >
                        {b.is_active ? "Desactivar" : "Activar"}
                      </ActionButton>
                    </TD>
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
