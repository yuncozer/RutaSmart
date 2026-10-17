import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { ActionForm } from "@/components/action-form";
import { createClient } from "@/lib/supabase/server";
import { BOOLEAN_FEATURES, FEATURE_LABELS } from "@/lib/plans";
import type { Plan } from "@/lib/types";
import { updatePlan } from "../actions";

export const metadata = { title: "Planes" };

export default async function PlansPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("plans").select("*").order("monthly_price_usd");
  const plans = (data ?? []) as Plan[];

  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title="Planes"
        description="Precio mensual por bus y funciones incluidas. Los cambios aplican de inmediato a todos los clientes del plan."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <CardTitle>
                {plan.name}{" "}
                <span className="text-muted-foreground font-mono text-xs">({plan.code})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActionForm action={updatePlan}>
                <input type="hidden" name="id" value={plan.id} />
                <Field label="Nombre" htmlFor={`name-${plan.id}`}>
                  <Input id={`name-${plan.id}`} name="name" defaultValue={plan.name} required />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="USD / bus / mes" htmlFor={`price-${plan.id}`}>
                    <Input
                      id={`price-${plan.id}`}
                      name="monthly_price_usd"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={plan.monthly_price_usd}
                      required
                    />
                  </Field>
                  <Field label="Máx. usuarios" htmlFor={`users-${plan.id}`}>
                    <Input
                      id={`users-${plan.id}`}
                      name="max_users"
                      type="number"
                      min="1"
                      defaultValue={plan.features.max_users ?? 1}
                      required
                    />
                  </Field>
                </div>
                <fieldset className="space-y-2">
                  <legend className="mb-2 text-sm font-medium">Funciones</legend>
                  {BOOLEAN_FEATURES.map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name={`f_${key}`}
                        defaultChecked={Boolean(plan.features[key])}
                        className="accent-navy-700 size-4"
                      />
                      {FEATURE_LABELS[key]}
                    </label>
                  ))}
                </fieldset>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={plan.is_active}
                    className="accent-navy-700 size-4"
                  />
                  Plan activo (visible en la landing)
                </label>
              </ActionForm>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
