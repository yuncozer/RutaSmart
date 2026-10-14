"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Loader2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/form-message";
import type { ActionState } from "@/components/action-form";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

async function sha256Hex(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Sube el .bin directo a Supabase Storage y luego registra la versión en el servidor. */
export function FirmwareUploadForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, undefined);
  const [localError, setLocalError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(undefined);
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file") as File | null;
    const version = String(fd.get("version") ?? "").trim();
    if (!/^\d+\.\d+\.\d+$/.test(version)) return setLocalError("Usa el formato x.y.z (ej. 0.2.0)");
    if (!file || file.size === 0) return setLocalError("Selecciona el archivo .bin");
    if (file.size > 16 * 1024 * 1024) return setLocalError("El archivo supera 16 MB");

    startTransition(async () => {
      const checksum = await sha256Hex(file);
      const path = `${version}/firmware.bin`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("firmware")
        .upload(path, file, { contentType: "application/octet-stream", upsert: false });
      if (error) {
        setLocalError(`No se pudo subir: ${error.message}`);
        return;
      }
      fd.delete("file");
      fd.set("file_path", path);
      fd.set("checksum_sha256", checksum);
      formAction(fd);
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Versión" htmlFor="version">
          <Input id="version" name="version" placeholder="0.2.0" required />
        </Field>
        <Field label="Versión del modelo IA" htmlFor="model_version">
          <Input id="model_version" name="model_version" placeholder="m-0.2" />
        </Field>
        <Field label="Archivo .bin" htmlFor="file">
          <Input
            id="file"
            name="file"
            type="file"
            accept=".bin,application/octet-stream"
            required
          />
        </Field>
      </div>
      <Field label="Notas de la versión" htmlFor="release_notes">
        <Textarea id="release_notes" name="release_notes" />
      </Field>
      <FormMessage state={localError ? { error: localError } : state} />
      <Button type="submit" disabled={pending} className="sm:w-fit">
        {pending ? <Loader2 className="animate-spin" /> : <Upload />} Subir versión
      </Button>
    </form>
  );
}
