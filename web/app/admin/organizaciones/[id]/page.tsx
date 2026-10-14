import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ActionButton, ActionForm } from "@/components/action-form";
import { OrgFields } from "@/components/admin/org-fields";
import { BusCreateFields } from "@/components/admin/bus-fields";
import { DeviceStatusBadge, OnlineDot, SubscriptionBadge } from "@/components/status-badges";
import { createClient } from "@/lib/supabase/server";
import { computeSubscriptionStatus } from "@/lib/subscription";
import { formatDate } from "@/lib/format";
import { PLAN_NAMES } from "@/lib/plans";
import type { Bus, Device, Organization, PlanCode, Subscription } from "@/lib/types";
import {
  createBus,
  inviteOrgUser,
  removeOrgUser,
  updateBus,
  updateOrganization,
} from "../../actions";

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .maybeSingle<Organization>();
  if (!org) notFound();

  const [{ data: buses }, { data: devices }, { data: members }, { data: subs }] = await Promise.all(
    [
      supabase.from("buses").select("*").eq("organization_id", id).order("plate"),
      supabase
        .from("devices")
        .select("id, serial, bus_id, status, last_seen_at")
        .eq("organization_id", id),
      supabase.rpc("org_members", { p_org_id: id }),
      supabase
        .from("subscriptions")
        .select("*, plan:plans(code, name)")
        .eq("organization_id", id)
        .order("created_at", { ascending: false }),
    ],
  );

  const busList = (buses ?? []) as Bus[];
  const deviceByBus = new Map(((devices ?? []) as Device[]).map((d) => [d.bus_id, d]));
  const memberList = (members ?? []) as {
    user_id: string;
    full_name: string;
    email: string;
    role: string;
  }[];
  const subList = (subs ?? []) as (Subscription & { plan: { code: PlanCode; name: string } })[];
  const sub = subList.find((s) => s.status !== "canceled") ?? null;
  const tz = { country: org.country, timezone: org.timezone };

  return (
    <>
      <Link
        href="/admin/organizaciones"
        className="text-link mb-3 inline-flex items-center gap-1 text-sm hover:underline"
      >
        <ArrowLeft className="size-4" /> Organizaciones
      </Link>
      <PageHeader
        title={org.name}
        description={`${org.country === "VE" ? "Venezuela" : "Colombia"} · ${org.timezone}`}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Datos de la organización</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={updateOrganization} submitClassName="sm:w-fit">
              <OrgFields org={org} />
            </ActionForm>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Suscripción</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {sub ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Plan {PLAN_NAMES[sub.plan.code]}</span>
                  <SubscriptionBadge status={computeSubscriptionStatus(sub)} />
                </div>
                <p className="text-muted-foreground">
                  {sub.bus_quantity} buses · {sub.modality === "purchase" ? "Compra" : "Alquiler"} ·{" "}
                  {sub.billing_cycle === "annual" ? "Anual" : "Mensual"}
                </p>
                <p>
                  Vence: <strong>{formatDate(sub.current_period_end, tz)}</strong>
                </p>
                <Link
                  href={`/admin/suscripciones/${sub.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Ver / editar suscripción
                </Link>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">Sin suscripción activa.</p>
                <Link
                  href={`/admin/suscripciones?nueva=${org.id}`}
                  className={buttonVariants({ size: "sm" })}
                >
                  Crear suscripción
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>
            Buses ({busList.filter((b) => b.is_active).length} activos
            {sub ? ` de ${sub.bus_quantity}` : ""})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {busList.length ? (
            <Table>
              <THead>
                <tr>
                  <TH>Placa</TH>
                  <TH>Ruta</TH>
                  <TH>Dispositivo</TH>
                  <TH>Estado</TH>
                  <TH />
                </tr>
              </THead>
              <TBody>
                {busList.map((b) => {
                  const d = deviceByBus.get(b.id);
                  return (
                    <tr key={b.id}>
                      <TD className="font-medium">
                        {b.plate}
                        <span className="text-muted-foreground block text-xs">{b.alias}</span>
                      </TD>
                      <TD>{b.route_name ?? "—"}</TD>
                      <TD>
                        {d ? (
                          <span className="flex flex-col gap-1">
                            <span className="font-mono text-xs">{d.serial}</span>
                            <span className="flex gap-2">
                              <DeviceStatusBadge status={d.status} />
                              <OnlineDot lastSeen={d.last_seen_at} />
                            </span>
                          </span>
                        ) : (
                          <Link
                            href="/admin/dispositivos"
                            className="text-link text-xs hover:underline"
                          >
                            Asignar
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
                  );
                })}
              </TBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">Sin buses registrados.</p>
          )}
          <div className="bg-muted/60 rounded-xl p-4">
            <p className="mb-3 text-sm font-medium">Agregar bus</p>
            <ActionForm
              action={createBus}
              submitLabel="Agregar bus"
              resetOnSuccess
              submitClassName="sm:w-fit"
            >
              <input type="hidden" name="organization_id" value={org.id} />
              <BusCreateFields />
            </ActionForm>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Usuarios</CardTitle>
          <CardDescription>Dueños y conductores con acceso al portal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {memberList.length ? (
            <Table>
              <THead>
                <tr>
                  <TH>Nombre</TH>
                  <TH>Correo</TH>
                  <TH>Rol</TH>
                  <TH />
                </tr>
              </THead>
              <TBody>
                {memberList.map((m) => (
                  <tr key={m.user_id}>
                    <TD>{m.full_name}</TD>
                    <TD>{m.email}</TD>
                    <TD>
                      <Badge variant={m.role === "owner" ? "default" : "muted"}>
                        {m.role === "owner" ? "Dueño" : "Conductor"}
                      </Badge>
                    </TD>
                    <TD className="text-right">
                      <ActionButton
                        action={removeOrgUser}
                        fields={{ organization_id: org.id, user_id: m.user_id }}
                        variant="ghost"
                        confirm={`¿Quitar a ${m.email} de la organización?`}
                      >
                        Quitar
                      </ActionButton>
                    </TD>
                  </tr>
                ))}
              </TBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">Sin usuarios.</p>
          )}
          <div className="bg-muted/60 rounded-xl p-4">
            <p className="mb-3 text-sm font-medium">Agregar usuario</p>
            <ActionForm
              action={inviteOrgUser}
              submitLabel="Agregar"
              resetOnSuccess
              submitClassName="sm:w-fit"
            >
              <input type="hidden" name="organization_id" value={org.id} />
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Correo" htmlFor="email">
                  <Input id="email" name="email" type="email" required />
                </Field>
                <Field label="Nombre" htmlFor="full_name">
                  <Input id="full_name" name="full_name" />
                </Field>
                <Field label="Rol" htmlFor="role">
                  <Select id="role" name="role" defaultValue="owner">
                    <option value="owner">Dueño</option>
                    <option value="driver">Conductor</option>
                  </Select>
                </Field>
              </div>
            </ActionForm>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
