"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "../actions";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { FormMessage } from "@/components/form-message";

export default function RecoverPage() {
  const [state, action] = useActionState(requestPasswordReset, undefined);
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Recuperar contraseña</h1>
      <p className="text-muted-foreground mb-6 text-sm">Te enviaremos un enlace a tu correo.</p>
      <form action={action} className="flex flex-col gap-4">
        <Field label="Correo electrónico" htmlFor="email">
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </Field>
        <FormMessage state={state} />
        <SubmitButton pendingText="Enviando…">Enviar enlace</SubmitButton>
        <Link href="/login" className="text-link text-center text-sm hover:underline">
          Volver a ingresar
        </Link>
      </form>
    </>
  );
}
