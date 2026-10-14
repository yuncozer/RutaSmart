"use client";

import { useActionState } from "react";
import { updatePassword } from "../actions";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { FormMessage } from "@/components/form-message";

export default function UpdatePasswordPage() {
  const [state, action] = useActionState(updatePassword, undefined);
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Crea tu contraseña</h1>
      <p className="text-muted-foreground mb-6 text-sm">Mínimo 8 caracteres.</p>
      <form action={action} className="flex flex-col gap-4">
        <Field label="Nueva contraseña" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
          />
        </Field>
        <Field label="Repite la contraseña" htmlFor="confirm">
          <Input id="confirm" name="confirm" type="password" required autoComplete="new-password" />
        </Field>
        <FormMessage state={state} />
        <SubmitButton pendingText="Guardando…">Guardar contraseña</SubmitButton>
      </form>
    </>
  );
}
