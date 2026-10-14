"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "../actions";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { FormMessage } from "@/components/form-message";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(login, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Correo electrónico" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@empresa.com"
        />
      </Field>
      <Field label="Contraseña" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingText="Ingresando…" size="lg">
        Ingresar
      </SubmitButton>
      <Link href="/recuperar" className="text-link text-center text-sm hover:underline">
        ¿Olvidaste tu contraseña?
      </Link>
    </form>
  );
}
