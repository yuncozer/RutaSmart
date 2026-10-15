import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { getProfile, getUser } from "@/lib/auth";
import { mustChangePassword } from "@/lib/password-policy";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Cambiar contraseña" };

export default async function UpdatePasswordPage() {
  // El middleware garantiza que hay sesión
  const [user, profile] = await Promise.all([getUser(), getProfile()]);
  const forced = mustChangePassword(user);
  const backHref = profile?.is_superadmin ? "/admin" : "/app";

  return (
    <>
      {!forced ? (
        <Link
          href={backHref}
          className="text-link mb-4 inline-flex items-center gap-1 text-sm hover:underline"
        >
          <ArrowLeft className="size-4" /> Volver al panel
        </Link>
      ) : null}
      <h1 className="text-2xl font-bold tracking-tight">
        {forced ? "Crea tu contraseña" : "Cambiar contraseña"}
      </h1>
      <p className="text-muted-foreground mb-6 text-sm">
        {user?.email ? <span className="font-medium">{user.email}</span> : null} · Mínimo 8
        caracteres.
      </p>
      {forced ? (
        <Alert variant="info" className="mb-4">
          Ingresaste con una contraseña temporal. Por seguridad, crea tu propia contraseña para
          continuar.
        </Alert>
      ) : null}
      <PasswordForm />
      {forced ? (
        <form action="/auth/salir" method="post" className="mt-4 text-center">
          <button className="text-muted-foreground text-sm hover:underline">Cerrar sesión</button>
        </form>
      ) : null}
    </>
  );
}
