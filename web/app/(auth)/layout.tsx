import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh md:grid-cols-2">
      <aside className="bg-navy-950 relative isolate hidden flex-col justify-between overflow-hidden p-10 text-white md:flex">
        {/* Mismo fondo del landing: foto + degradado + brillo eléctrico */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <Image
            src="/images/hero-bus-noche.webp"
            alt=""
            fill
            priority
            sizes="50vw"
            className="object-cover object-[70%_center] opacity-50"
          />
          <div className="from-navy-950 via-navy-950/70 to-navy-950/30 absolute inset-0 bg-gradient-to-t" />
          <div className="animate-aurora bg-electric/30 absolute -left-20 -top-32 size-[28rem] rounded-full blur-[120px]" />
          <div className="bg-grid mask-radial absolute inset-0" />
        </div>
        <Link href="/">
          <Logo light />
        </Link>
        <div>
          <p className="text-4xl font-semibold leading-tight tracking-tight">
            <span className="text-gradient">Cada pasajero,</span>
            <br />
            contado.
          </p>
          <p className="mt-4 max-w-sm text-white/65">
            Entra para ver cuántas personas suben a tus buses, dónde están y cuánto rinde cada ruta.
          </p>
          <p className="mt-8 flex items-center gap-2 text-sm text-white/50">
            <ShieldCheck className="size-4 text-emerald-300" /> Conexión segura · Sin video en la
            nube
          </p>
        </div>
        <p className="text-xs text-white/40">© RutaSmart RU7</p>
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
