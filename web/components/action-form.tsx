"use client";

import { useActionState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { SubmitButton } from "@/components/submit-button";
import { FormMessage } from "@/components/form-message";
import type { ButtonProps } from "@/components/ui/button";

export type ActionState = { error?: string; success?: string } | undefined;
type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Formulario genérico para Server Actions: muestra error/éxito y estado de carga.
 * Los campos (children) pueden renderizarse en el servidor.
 */
export function ActionForm({
  action,
  children,
  submitLabel = "Guardar",
  pendingText = "Guardando…",
  className,
  resetOnSuccess = false,
  submitVariant,
  submitClassName,
  confirm,
}: {
  action: Action;
  children?: React.ReactNode;
  submitLabel?: React.ReactNode;
  pendingText?: string;
  className?: string;
  resetOnSuccess?: boolean;
  submitVariant?: ButtonProps["variant"];
  submitClassName?: string;
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state?.success) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={ref}
      action={formAction}
      className={cn("flex flex-col gap-4", className)}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      <FormMessage state={state} />
      <SubmitButton pendingText={pendingText} variant={submitVariant} className={submitClassName}>
        {submitLabel}
      </SubmitButton>
    </form>
  );
}

/** Botón que ejecuta una acción simple (activar, desactivar…) sin campos visibles. */
export function ActionButton({
  action,
  fields,
  children,
  variant = "outline",
  confirm,
}: {
  action: Action;
  fields: Record<string, string>;
  children: React.ReactNode;
  variant?: ButtonProps["variant"];
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form
      action={formAction}
      className="inline-flex flex-col gap-1"
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <SubmitButton size="sm" variant={variant} pendingText="…">
        {children}
      </SubmitButton>
      {state?.error ? <span className="text-danger text-xs">{state.error}</span> : null}
    </form>
  );
}
