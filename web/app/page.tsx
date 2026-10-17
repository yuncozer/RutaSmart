import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  Check,
  CloudOff,
  Cpu,
  EyeOff,
  FileSpreadsheet,
  Gauge,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Moon,
  ShieldCheck,
  Smartphone,
  UserX,
  Wifi,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { HeroVisual } from "@/components/landing/hero-visual";
import { DoorVisual } from "@/components/landing/door-visual";
import { DeviceVisual } from "@/components/landing/device-visual";
import { getPublicPlans } from "@/lib/plans";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

export const revalidate = 3600;

const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

const facts = [
  { value: "0", label: "imágenes enviadas a la nube" },
  { value: "24/7", label: "conteo continuo, de día y de noche" },
  { value: "100%", label: "de los datos se conservan sin señal" },
  { value: "3 meses", label: "gratis si compras el equipo" },
];

const steps = [
  {
    n: "01",
    title: "Instala el equipo",
    text: "Se coloca sobre la puerta y se alimenta del bus. Tiene batería de respaldo.",
  },
  {
    n: "02",
    title: "La IA cuenta",
    text: "Detecta a cada persona que cruza la línea virtual y registra si sube o baja.",
  },
  {
    n: "03",
    title: "Se sincroniza solo",
    text: "Envía los conteos por WiFi. Si no hay señal, los guarda y los envía después.",
  },
  {
    n: "04",
    title: "Decides con datos",
    text: "Ves pasajeros por día, hora y bus desde el teléfono, y descargas reportes en Excel.",
  },
];

const features = [
  {
    icon: LayoutDashboard,
    title: "Tu flota en el teléfono",
    text: "Pasajeros de hoy, mapa en vivo con la ubicación GPS de cada bus, recorrido del día y las paradas donde más gente sube.",
    className: "md:col-span-2",
  },
  {
    icon: UserX,
    title: "Anti-fraude",
    text: "Los cruces del conductor se excluyen del total y se auditan aparte.",
  },
  {
    icon: FileSpreadsheet,
    title: "Reportes en Excel",
    text: "Por rango de fechas y por bus, listos para tu contabilidad.",
  },
  {
    icon: EyeOff,
    title: "Privacidad total",
    text: "La cámara procesa dentro del equipo. Nunca se envían ni se guardan imágenes: solo números.",
    className: "md:col-span-2",
  },
  {
    icon: BellRing,
    title: "Alertas",
    text: "Te avisamos si un equipo se desconecta o si algo no cuadra.",
  },
  {
    icon: Smartphone,
    title: "Hecho para tu equipo",
    text: "Dueños y conductores con su propio acceso. Cada conductor ve solo los buses que tiene asignados.",
    className: "md:col-span-2",
  },
];

const hardware = [
  { icon: Cpu, title: "IA en el borde", text: "ESP32-S3 con cámara OV5640" },
  { icon: Moon, title: "Visión nocturna", text: "Iluminación infrarroja 850 nm" },
  { icon: Gauge, title: "Doble sensor", text: "Láser de distancia para mayor precisión" },
  { icon: MapPin, title: "GPS integrado", text: "Mapa en vivo y cada subida ubicada en la ruta" },
  { icon: CloudOff, title: "Memoria local", text: "microSD: no se pierde ningún conteo" },
  { icon: Wifi, title: "Actualizable", text: "Mejoras del modelo por aire (OTA)" },
];

/** Fotos de Pexels usadas en el landing (licencia Pexels; atribución de cortesía). */
const PHOTO_CREDITS = [
  {
    name: "bayar-erdene B.",
    url: "https://www.pexels.com/photo/city-nightscape-with-bus-and-illuminated-buildings-30174043/",
  },
  {
    name: "Th2city Santana",
    url: "https://www.pexels.com/photo/bus-on-street-in-rain-at-night-19961414/",
  },
  {
    name: "Justin Hamilton",
    url: "https://www.pexels.com/photo/man-in-white-t-shirt-standing-on-the-bus-205353/",
  },
];

const faqs = [
  {
    q: "¿El equipo graba video de los pasajeros?",
    a: "No. La imagen se procesa dentro del equipo y se descarta al instante. A la nube solo llegan eventos de conteo: hora, si sube o baja, y ubicación.",
  },
  {
    q: "¿Qué pasa si el bus pasa por zonas sin señal?",
    a: "El equipo guarda cada conteo en su memoria y lo envía cuando recupera la conexión. Ningún pasajero se pierde ni se cuenta dos veces.",
  },
  {
    q: "¿Cómo evitan que el conductor altere el conteo?",
    a: "El sistema identifica los cruces del conductor, los excluye del total y los muestra aparte para auditarlos. Si hay demasiados, te llega una alerta.",
  },
  {
    q: "¿Cómo pago la suscripción?",
    a: "Pago móvil, Zelle, Binance, transferencia o efectivo. Pagas por bus cada mes, y el pago anual incluye 2 meses gratis.",
  },
];

export default async function LandingPage() {
  const plans = await getPublicPlans();
  const waLink = WHATSAPP
    ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hola, quiero información sobre RutaSmart RU7")}`
    : "#contacto";

  return (
    <div className="bg-navy-950 selection:bg-electric/40 min-h-dvh overflow-x-clip text-white">
      {/* ------------------------------------------------------------ Navegación */}
      <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3">
        <nav className="glass mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl px-3 pl-4">
          <Link href="/" aria-label="RutaSmart RU7">
            <Logo light />
          </Link>
          <div className="hidden items-center gap-7 text-sm text-white/70 md:flex">
            <a href="#como-funciona" className="transition-colors hover:text-white">
              Cómo funciona
            </a>
            <a href="#equipo" className="transition-colors hover:text-white">
              Equipo
            </a>
            <a href="#planes" className="transition-colors hover:text-white">
              Planes
            </a>
            <a href="#preguntas" className="transition-colors hover:text-white">
              Preguntas
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-xl px-2 py-2 text-sm text-white/80 transition-colors hover:text-white sm:px-3"
            >
              Ingresar
            </Link>
            <a
              href={waLink}
              className="text-navy-950 rounded-xl bg-white px-4 py-2 text-sm font-semibold transition-transform hover:scale-[1.03]"
            >
              Solicitar demo
            </a>
          </div>
        </nav>
      </header>

      {/* ------------------------------------------------------------ Hero */}
      <section className="relative isolate overflow-hidden pb-20 pt-32 sm:pt-40 lg:pb-32">
        {/* Fondo: foto + aurora + grilla */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <Image
            src="/images/hero-bus-noche.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[70%_center] opacity-60"
          />
          <div className="from-navy-950 via-navy-950/85 to-navy-950/30 absolute inset-0 bg-gradient-to-r" />
          <div className="from-navy-950/60 to-navy-950/0 absolute inset-x-0 top-0 h-48 bg-gradient-to-b" />
          <div className="animate-aurora bg-electric/35 absolute -top-40 left-1/4 size-[38rem] rounded-full blur-[120px]" />
          <div className="animate-aurora bg-cyan/20 absolute -right-40 top-20 size-[30rem] rounded-full blur-[120px] [animation-delay:-6s]" />
          <div className="animate-aurora bg-accent/15 absolute -left-40 bottom-0 size-[26rem] rounded-full blur-[120px] [animation-delay:-12s]" />
          <div className="bg-grid mask-radial absolute inset-0" />
          <div className="from-navy-950 absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t" />
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <a
              href="#como-funciona"
              className="glass inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-xs text-white/80 transition-colors hover:text-white"
            >
              <span className="bg-electric rounded-full px-2 py-0.5 font-semibold text-white">
                IA a bordo
              </span>
              Conteo automático de pasajeros
              <ArrowRight className="size-3" />
            </a>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.02] tracking-tighter sm:text-6xl lg:text-7xl">
              <span className="text-gradient">Cada pasajero,</span>
              <br />
              contado.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/65">
              RutaSmart RU7 instala inteligencia artificial sobre la puerta de tus buses y te
              muestra, en tiempo real, cuántas personas suben y bajan en cada unidad. Sin planillas
              y sin adivinar.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href={waLink}
                className="bg-accent text-navy-950 shadow-accent/25 group inline-flex h-12 items-center gap-2 rounded-xl px-6 font-semibold shadow-lg transition-transform hover:scale-[1.03]"
              >
                <MessageCircle className="size-4" /> Hablar por WhatsApp
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="#planes"
                className="glass inline-flex h-12 items-center rounded-xl px-6 font-medium text-white transition-colors hover:bg-white/10"
              >
                Ver planes
              </a>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/50">
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-300" /> Sin video en la nube
              </span>
              <span className="flex items-center gap-2">
                <Check className="size-4 text-emerald-300" /> Venezuela y Colombia
              </span>
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>

      {/* ------------------------------------------------------------ Datos */}
      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-white/10 px-4 md:grid-cols-4 md:divide-x">
          {facts.map((f) => (
            <div key={f.label} className="py-8 md:px-6">
              <p className="text-3xl font-semibold tracking-tight sm:text-4xl">{f.value}</p>
              <p className="mt-1 text-sm text-white/50">{f.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ Cómo funciona */}
      <section id="como-funciona" className="scroll-mt-24 py-24 sm:py-32">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 lg:grid-cols-2">
          <div className="reveal">
            <p className="text-electric text-sm font-semibold uppercase tracking-widest">
              Cómo funciona
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Una línea virtual en la puerta. Cero errores de planilla.
            </h2>
            <ol className="mt-10 space-y-6">
              {steps.map((s) => (
                <li key={s.n} className="group flex gap-5">
                  <span className="text-electric font-mono text-sm">{s.n}</span>
                  <div className="group-hover:border-electric border-l border-white/10 pl-5 transition-colors">
                    <p className="font-medium">{s.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/55">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="reveal">
            <DoorVisual />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Funciones (bento) */}
      <section className="pb-24 sm:pb-32">
        <div className="mx-auto max-w-6xl px-4">
          <div className="reveal max-w-2xl">
            <p className="text-electric text-sm font-semibold uppercase tracking-widest">
              Plataforma
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Todo lo que necesitas para controlar tu flota.
            </h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {features.map(({ icon: Icon, title, text, className }) => (
              <div
                key={title}
                className={cn(
                  "reveal group relative overflow-hidden rounded-3xl bg-white/[0.03] p-7 ring-1 ring-white/10 transition-colors hover:bg-white/[0.06]",
                  className,
                )}
              >
                <div className="bg-electric/0 group-hover:bg-electric/20 absolute -right-16 -top-16 size-40 rounded-full blur-3xl transition-colors" />
                <div className="from-electric/30 to-cyan/10 grid size-11 place-items-center rounded-xl bg-gradient-to-br ring-1 ring-white/15">
                  <Icon className="size-5 text-white" />
                </div>
                <p className="mt-6 text-lg font-medium">{title}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Franja con foto */}
      <section className="relative isolate overflow-hidden">
        <Image
          src="/images/bus-calle-lluvia.webp"
          alt="Bus urbano circulando de noche bajo la lluvia"
          fill
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div className="from-navy-950 via-navy-950/70 to-navy-950/20 absolute inset-0 -z-10 bg-gradient-to-r" />
        <div className="from-navy-950 to-navy-950/0 absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b" />
        <div className="from-navy-950 to-navy-950/0 absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t" />
        <div className="mx-auto max-w-6xl px-4 py-28 sm:py-40">
          <div className="reveal max-w-xl">
            <p className="text-cyan text-sm font-semibold uppercase tracking-widest">
              Para rutas reales
            </p>
            <p className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Lluvia, noche, huecos y zonas sin señal.{" "}
              <span className="text-white/50">RU7 sigue contando.</span>
            </p>
            <div className="mt-8 flex flex-wrap gap-2 text-sm">
              {["Visión infrarroja", "Cola local sin conexión", "Batería de respaldo"].map((t) => (
                <span key={t} className="glass rounded-full px-3 py-1.5 text-white/80">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Equipo */}
      <section
        id="equipo"
        className="relative scroll-mt-24 overflow-hidden border-y border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent py-24 sm:py-32"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 lg:grid-cols-2">
          <div className="reveal order-2 lg:order-1">
            <DeviceVisual />
          </div>
          <div className="reveal order-1 lg:order-2">
            <p className="text-electric text-sm font-semibold uppercase tracking-widest">
              El equipo
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Hardware diseñado para la calle.
            </h2>
            <p className="mt-4 text-white/60">
              Compacto, se alimenta del bus y tiene batería de respaldo. Funciona de día, de noche y
              sin conexión.
            </p>
            <div className="mt-10 grid gap-x-6 gap-y-7 sm:grid-cols-2">
              {hardware.map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex gap-3">
                  <Icon className="text-cyan mt-0.5 size-5 shrink-0" />
                  <div>
                    <p className="font-medium">{title}</p>
                    <p className="text-sm text-white/50">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Planes */}
      <section id="planes" className="scroll-mt-24 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4">
          <div className="reveal mx-auto max-w-2xl text-center">
            <p className="text-electric text-sm font-semibold uppercase tracking-widest">Planes</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Paga por bus. Crece cuando quieras.
            </h2>
            <p className="mt-4 text-white/60">
              Compra el equipo y los 3 primeros meses son gratis, o alquílalo sin inversión inicial.
              Descuento para flotas desde 5 buses.
            </p>
          </div>
          <div className="mt-14 grid items-stretch gap-5 lg:grid-cols-3">
            {plans.map((plan) => {
              const featured = plan.code === "pro";
              return (
                <div
                  key={plan.code}
                  className={cn(
                    "reveal relative rounded-3xl p-px",
                    featured
                      ? "from-electric via-cyan to-accent shadow-electric/20 bg-gradient-to-br shadow-2xl"
                      : "bg-white/10",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-full flex-col rounded-[calc(1.5rem-1px)] p-8",
                      featured ? "bg-navy-900" : "bg-navy-950",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-medium">{plan.name}</p>
                      {featured ? (
                        <span className="bg-electric/20 text-electric rounded-full px-2.5 py-1 text-xs font-semibold">
                          Recomendado
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-6 flex items-baseline gap-1">
                      <span className="text-5xl font-semibold tracking-tight">
                        {formatUsd(plan.monthly_price_usd)}
                      </span>
                      <span className="text-sm text-white/50">/bus/mes</span>
                    </p>
                    <ul className="mt-8 flex-1 space-y-3 text-sm text-white/75">
                      {plan.highlights.map((h) => (
                        <li key={h} className="flex gap-3">
                          <Check className="text-cyan size-4 shrink-0" /> {h}
                        </li>
                      ))}
                    </ul>
                    <a
                      href={waLink}
                      className={cn(
                        "mt-8 inline-flex h-11 items-center justify-center rounded-xl text-sm font-semibold transition-transform hover:scale-[1.02]",
                        featured ? "text-navy-950 bg-white" : "glass text-white",
                      )}
                    >
                      Elegir {plan.name}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Preguntas */}
      <section id="preguntas" className="scroll-mt-24 pb-24 sm:pb-32">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="reveal text-center text-4xl font-semibold tracking-tight">
            Preguntas frecuentes
          </h2>
          <div className="mt-10 divide-y divide-white/10 rounded-3xl bg-white/[0.03] ring-1 ring-white/10">
            {faqs.map((f) => (
              <details key={f.q} className="group px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {f.q}
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/5 text-white/60 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-white/60">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ CTA final */}
      <section id="contacto" className="px-4 pb-24">
        <div className="reveal from-navy-800 via-navy-900 to-navy-950 relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-gradient-to-br px-6 py-16 text-center ring-1 ring-white/10 sm:px-16 sm:py-20">
          <Image
            src="/images/interior-pasajeros.webp"
            alt=""
            fill
            sizes="(min-width: 1152px) 1152px, 100vw"
            className="object-cover opacity-30"
          />
          <div className="from-navy-950/90 via-navy-900/80 to-navy-950/90 absolute inset-0 bg-gradient-to-br" />
          <div className="bg-electric/30 absolute -top-24 left-1/2 size-96 -translate-x-1/2 rounded-full blur-[100px]" />
          <div className="bg-grid mask-radial absolute inset-0 opacity-50" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Empieza a contar cada pasajero desde este mes.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/60">
              Escríbenos y te mostramos el panel funcionando con datos reales de una ruta.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <a
                href={waLink}
                className="bg-accent text-navy-950 shadow-accent/25 inline-flex h-12 items-center gap-2 rounded-xl px-6 font-semibold shadow-lg transition-transform hover:scale-[1.03]"
              >
                <MessageCircle className="size-4" /> Hablar por WhatsApp
              </a>
              <Link
                href="/login"
                className="glass inline-flex h-12 items-center rounded-xl px-6 font-medium text-white transition-colors hover:bg-white/10"
              >
                Ingresar a mi cuenta
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Pie */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-white/45 sm:flex-row">
          <Logo light />
          <div className="flex flex-col items-center gap-1 sm:items-end">
            <p className="flex items-center gap-2">
              <ShieldCheck className="size-4" /> Sin imágenes, solo conteos · RutaSmart RU7 ©{" "}
              {new Date().getFullYear()}
            </p>
            <p className="text-xs text-white/30">
              Fotos:{" "}
              {PHOTO_CREDITS.map((c, i) => (
                <span key={c.url}>
                  {i > 0 ? ", " : null}
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white/60"
                  >
                    {c.name}
                  </a>
                </span>
              ))}{" "}
              en Pexels
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
