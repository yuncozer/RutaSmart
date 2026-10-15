"use client";

import { useActionState } from "react";
import { updatePassword } from "../actions";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { FormMessage } from "@/components/form-message";

export function PasswordForm() {
  const [state, action] = useActionState(updatePassword, undefined);
  return (
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
  );
}
