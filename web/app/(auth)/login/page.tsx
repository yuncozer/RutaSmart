import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Bienvenido</h1>
      <p className="text-muted-foreground mb-6 text-sm">Ingresa con tu correo y contraseña.</p>
      {error ? (
        <p className="bg-danger/10 text-danger mb-4 rounded-lg px-3 py-2 text-sm">
          El enlace no es válido o expiró. Intenta de nuevo.
        </p>
      ) : null}
      <LoginForm next={next} />
    </>
  );
}
