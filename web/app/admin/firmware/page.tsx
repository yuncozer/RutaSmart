import { HardDriveUpload } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { ActionButton } from "@/components/action-form";
import { FirmwareUploadForm } from "@/components/admin/firmware-upload";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { createFirmwareRelease, setFirmwareStable } from "../actions";

export const metadata = { title: "Firmware" };

interface Release {
  id: string;
  version: string;
  model_version: string | null;
  checksum_sha256: string;
  is_stable: boolean;
  release_notes: string | null;
  created_at: string;
}

export default async function FirmwarePage() {
  const supabase = await createClient();
  const [{ data }, { data: versions }] = await Promise.all([
    supabase.from("firmware_releases").select("*").order("created_at", { ascending: false }),
    supabase.from("devices").select("firmware_version").neq("status", "retired"),
  ]);
  const releases = (data ?? []) as Release[];
  const installed = new Map<string, number>();
  for (const d of versions ?? []) {
    const v = d.firmware_version ?? "desconocida";
    installed.set(v, (installed.get(v) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader
        title="Firmware"
        description="Los equipos descargan por OTA la última versión marcada como estable (si es más nueva que la instalada)."
      />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Subir versión</CardTitle>
        </CardHeader>
        <CardContent>
          <FirmwareUploadForm action={createFirmwareRelease} />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Versiones instaladas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {[...installed.entries()].map(([v, n]) => (
            <Badge key={v} variant="muted">
              {v}: {n} equipo{n === 1 ? "" : "s"}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Versiones</CardTitle>
        </CardHeader>
        <CardContent>
          {releases.length === 0 ? (
            <EmptyState
              icon={HardDriveUpload}
              title="Aún no hay versiones"
              description="Sube el primer binario compilado con PlatformIO."
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Versión</TH>
                  <TH>Modelo</TH>
                  <TH>SHA-256</TH>
                  <TH>Fecha</TH>
                  <TH>Estado</TH>
                  <TH />
                </tr>
              </THead>
              <TBody>
                {releases.map((r) => (
                  <tr key={r.id}>
                    <TD className="font-mono font-medium">
                      {r.version}
                      {r.release_notes ? (
                        <span className="text-muted-foreground block font-sans text-xs">
                          {r.release_notes}
                        </span>
                      ) : null}
                    </TD>
                    <TD>{r.model_version ?? "—"}</TD>
                    <TD className="font-mono text-xs">{r.checksum_sha256.slice(0, 16)}…</TD>
                    <TD>{formatDate(r.created_at)}</TD>
                    <TD>
                      {r.is_stable ? (
                        <Badge variant="success">Estable</Badge>
                      ) : (
                        <Badge variant="muted">Borrador</Badge>
                      )}
                    </TD>
                    <TD className="text-right">
                      <ActionButton
                        action={setFirmwareStable}
                        fields={{ id: r.id, stable: String(!r.is_stable) }}
                        confirm={
                          r.is_stable
                            ? undefined
                            : `¿Publicar ${r.version}? Los equipos la instalarán por OTA.`
                        }
                      >
                        {r.is_stable ? "Quitar estable" : "Marcar estable"}
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
