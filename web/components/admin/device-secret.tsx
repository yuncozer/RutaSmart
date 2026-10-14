"use client";

import { useActionState, useState } from "react";
import { Check, Copy, KeyRound, Plus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import type { DeviceSecretState } from "@/app/admin/actions";

type SecretAction = (prev: DeviceSecretState, fd: FormData) => Promise<DeviceSecretState>;

function SecretReveal({ serial, secret }: { serial: string; secret: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Alert variant="warning" className="space-y-2">
      <p className="font-semibold">Guarda este secreto ahora: no se volverá a mostrar.</p>
      <p>
        Serial: <span className="font-mono">{serial}</span>
      </p>
      <div className="flex items-center gap-2">
        <code className="bg-card text-foreground flex-1 break-all rounded px-2 py-1 font-mono text-xs">
          {secret}
        </code>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(secret);
            setCopied(true);
          }}
        >
          {copied ? <Check /> : <Copy />} {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
    </Alert>
  );
}

/** Registrar un dispositivo nuevo: genera serial + secreto (mostrado una vez). */
export function RegisterDeviceForm({ action }: { action: SecretAction }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <div className="space-y-3">
      <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Modalidad" htmlFor="modality" className="sm:w-56">
          <Select id="modality" name="modality" defaultValue="">
            <option value="">Sin definir</option>
            <option value="purchase">Compra</option>
            <option value="rental">Alquiler</option>
          </Select>
        </Field>
        <SubmitButton pendingText="Generando…">
          <Plus /> Registrar dispositivo
        </SubmitButton>
      </form>
      {state?.error ? <Alert variant="danger">{state.error}</Alert> : null}
      {state?.secret && state.serial ? (
        <SecretReveal serial={state.serial} secret={state.secret} />
      ) : null}
    </div>
  );
}

/** Generar un secreto nuevo (invalida el anterior). */
export function RotateSecretButton({
  action,
  id,
  serial,
}: {
  action: SecretAction;
  id: string;
  serial: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <div className="space-y-2">
      <form
        action={formAction}
        onSubmit={(e) => {
          if (
            !window.confirm(
              `¿Generar un secreto nuevo para ${serial}? El equipo dejará de conectarse hasta reconfigurarlo.`,
            )
          )
            e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="serial" value={serial} />
        <SubmitButton size="sm" variant="ghost" pendingText="…">
          <KeyRound /> Nuevo secreto
        </SubmitButton>
      </form>
      {state?.error ? <p className="text-danger text-xs">{state.error}</p> : null}
      {state?.secret ? <SecretReveal serial={serial} secret={state.secret} /> : null}
    </div>
  );
}
