import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo />
      <h1 className="text-2xl font-bold">Página no encontrada</h1>
      <p className="text-muted-foreground">La ruta que buscas no existe o no tienes acceso.</p>
      <Link href="/" className={buttonVariants()}>
        Ir al inicio
      </Link>
    </div>
  );
}
