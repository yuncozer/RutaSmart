import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh md:grid-cols-2">
      <aside className="bg-navy-900 hidden flex-col justify-between p-10 text-white md:flex">
        <Link href="/">
          <Logo light />
        </Link>
        <div>
          <p className="text-3xl font-bold leading-tight">
            Cada pasajero cuenta.
            <br />
            <span className="text-accent">Ahora también en tus números.</span>
          </p>
          <p className="text-navy-100/70 mt-4">Conteo automático de pasajeros para autobuses.</p>
        </div>
        <p className="text-navy-100/50 text-xs">© RutaSmart RU7</p>
      </aside>
      <main className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 inline-block md:hidden">
            <Logo />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
