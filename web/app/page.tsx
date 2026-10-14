import Link from "next/link";
import {
  BarChart3,
  Bus,
  Camera,
  Check,
  CloudUpload,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublicPlans } from "@/lib/plans";
import { formatUsd } from "@/lib/format";

export const revalidate = 3600;

const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

const steps = [
  {
    icon: Camera,
    title: "Cuenta en el bus",
    text: "Un equipo con cámara sobre la puerta detecta y cuenta a cada pasajero que sube y baja. Sin enviar imágenes.",
  },
  {
    icon: CloudUpload,
    title: "Sincroniza solo",
    text: "Los conteos se envían por WiFi. Si no hay conexión, se guardan en el equipo y se envían después.",
  },
  {
    icon: BarChart3,
    title: "Decide con datos",
    text: "Ve pasajeros por día, hora y ruta desde tu teléfono. Descarga reportes en Excel.",
  },
];

export default async function LandingPage() {
  const plans = await getPublicPlans();
  const waLink = WHATSAPP
    ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hola, quiero información sobre RutaSmart")}`
    : "#contacto";

  return (
    <div className="min-h-dvh">
      <header className="bg-background/80 sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link href="/login" className={buttonVariants({ size: "sm" })}>
              Ingresar
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-navy-900 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="flex flex-col justify-center gap-6">
            <span className="text-navy-100 w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              Venezuela · Colombia
            </span>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Sabe cuántos pasajeros mueve cada bus.{" "}
              <span className="text-accent">Automáticamente.</span>
            </h1>
            <p className="text-navy-100/80 text-lg">
              RutaSmart cuenta las personas que suben y bajan de tus unidades y te muestra los
              números en tiempo real desde el teléfono.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href={waLink} className={buttonVariants({ variant: "accent", size: "lg" })}>
                <MessageCircle /> Escríbenos por WhatsApp
              </a>
              <a
                href="#planes"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "border-white/30 bg-transparent text-white hover:bg-white/10",
                })}
              >
                Ver planes
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 self-center">
            {[
              ["1.248", "pasajeros hoy"],
              ["+12%", "vs. semana pasada"],
              ["7:00", "hora pico"],
              ["5/5", "equipos en línea"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                <p className="text-3xl font-bold">{value}</p>
                <p className="text-navy-100/70 text-sm">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-8 text-2xl font-bold tracking-tight">¿Cómo funciona?</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <CardHeader>
                <Icon className="text-navy-500 size-8" />
                <CardTitle className="mt-2">{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">{text}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="planes" className="bg-navy-50 dark:bg-navy-950 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-bold tracking-tight">Planes</h2>
          <p className="text-muted-foreground mb-8">
            Precio mensual por bus. Si compras el equipo, los 3 primeros meses son gratis.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.code}
                className={plan.code === "pro" ? "ring-navy-500 ring-2" : undefined}
              >
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <p className="text-3xl font-bold">
                    {formatUsd(plan.monthly_price_usd)}
                    <span className="text-muted-foreground text-sm font-normal"> /bus/mes</span>
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {plan.highlights.map((h) => (
                      <li key={h} className="flex gap-2">
                        <Check className="text-success size-4 shrink-0" /> {h}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="contacto" className="mx-auto max-w-6xl px-4 py-16">
        <Card className="bg-navy-900 flex flex-col items-start gap-4 p-8 text-white md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Bus className="text-accent size-10" />
            <div>
              <p className="text-xl font-semibold">¿Tienes una flota?</p>
              <p className="text-navy-100/80">
                Descuento desde 5 buses y 2 meses gratis con pago anual.
              </p>
            </div>
          </div>
          <a href={waLink} className={buttonVariants({ variant: "accent", size: "lg" })}>
            <MessageCircle /> Hablemos
          </a>
        </Card>
      </section>

      <footer className="text-muted-foreground border-t py-8 text-center text-sm">
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="size-4" /> RutaSmart © {new Date().getFullYear()} · Sin imágenes,
          solo conteos.
        </div>
      </footer>
    </div>
  );
}
