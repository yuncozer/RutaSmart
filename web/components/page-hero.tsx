import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Portada de las páginas de inicio del panel: misma estética del landing
 * (foto + degradado azul marino + brillo eléctrico), con mensajes simples.
 */
export function PageHero({
  image,
  eyebrow,
  title,
  description,
  children,
  aside,
  className,
}: {
  /** Ruta en /public/images */
  image: string;
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Acciones o datos debajo del texto */
  children?: React.ReactNode;
  /** Bloque destacado a la derecha (por ejemplo, el número del día) */
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "bg-navy-950 relative isolate mb-6 overflow-hidden rounded-3xl text-white sm:mb-8",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <Image
          src={image}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 1100px, 100vw"
          className="object-cover object-center opacity-45"
        />
        <div className="from-navy-950 via-navy-950/85 to-navy-950/35 absolute inset-0 bg-gradient-to-r" />
        <div className="bg-electric/30 absolute -left-24 -top-32 size-80 rounded-full blur-[100px]" />
        <div className="bg-cyan/15 absolute -bottom-24 right-10 size-72 rounded-full blur-[100px]" />
        <div className="bg-grid mask-radial absolute inset-0 opacity-60" />
      </div>
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:p-10">
        <div>
          {eyebrow ? (
            <p className="text-electric text-xs font-semibold uppercase tracking-widest">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
              {description}
            </p>
          ) : null}
          {children ? <div className="mt-6 flex flex-wrap gap-2">{children}</div> : null}
        </div>
        {aside ? <div className="lg:justify-self-end">{aside}</div> : null}
      </div>
    </section>
  );
}

/** Botón claro para usar dentro de PageHero. */
export const heroButton =
  "inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-transform hover:scale-[1.02]";
