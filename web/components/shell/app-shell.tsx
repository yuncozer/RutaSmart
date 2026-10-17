import Link from "next/link";
import { KeyRound, LogOut } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { BottomNav, SidebarNav, type NavName } from "./nav-link";

function initials(name: string) {
  return (
    name
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join("") || "RS"
  );
}

/**
 * Estructura común: sidebar azul marino (mismo estilo del landing) en escritorio,
 * barra superior + navegación inferior flotante en móvil (mobile first).
 */
export function AppShell({
  nav,
  navKeys,
  homeHref,
  title,
  userName,
  userDetail,
  banner,
  topRight,
  children,
}: {
  nav: NavName;
  navKeys?: string[];
  homeHref: string;
  title?: string;
  userName: string;
  userDetail?: string;
  banner?: React.ReactNode;
  topRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh lg:pl-72">
      <aside className="bg-navy-950 fixed inset-y-0 left-0 isolate hidden w-72 flex-col overflow-hidden p-5 lg:flex">
        {/* Fondo: brillo eléctrico + grilla, como el hero del landing */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="bg-electric/25 absolute -left-24 -top-24 size-72 rounded-full blur-[90px]" />
          <div className="bg-cyan/10 absolute -bottom-24 -right-24 size-72 rounded-full blur-[90px]" />
          <div className="bg-grid absolute inset-0 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_60%)]" />
        </div>

        <Link href={homeHref} className="mb-8 px-2 py-1">
          <Logo light />
        </Link>
        {title ? (
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-white/35">
            {title}
          </p>
        ) : null}
        <SidebarNav nav={nav} keys={navKeys} />

        <div className="glass mt-auto rounded-2xl p-3">
          <div className="flex items-center gap-3">
            <span className="from-electric to-cyan text-navy-950 grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-sm font-bold">
              {initials(userName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{userName}</p>
              {userDetail ? <p className="truncate text-xs text-white/50">{userDetail}</p> : null}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            <Link
              href="/actualizar-clave"
              className="flex items-center justify-center gap-1.5 rounded-lg bg-white/5 py-2 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <KeyRound className="size-3.5" /> Contraseña
            </Link>
            <form action="/auth/salir" method="post">
              <button className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/5 py-2 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white">
                <LogOut className="size-3.5" /> Salir
              </button>
            </form>
          </div>
        </div>
      </aside>

      <header className="bg-background/80 sticky top-0 z-20 flex h-16 items-center justify-between border-b px-4 backdrop-blur-xl lg:px-10">
        <Link href={homeHref} className="lg:hidden">
          <Logo />
        </Link>
        <div className="text-muted-foreground hidden items-center gap-2 text-sm lg:flex">
          <span className="bg-success size-2 rounded-full" />
          {userDetail}
        </div>
        <div className="flex items-center gap-1">
          {topRight}
          <ThemeToggle />
          <Link
            href="/actualizar-clave"
            aria-label="Cambiar contraseña"
            title="Cambiar contraseña"
            className="hover:bg-muted grid size-10 place-items-center rounded-xl lg:hidden"
          >
            <KeyRound className="size-4" />
          </Link>
          <form action="/auth/salir" method="post" className="lg:hidden">
            <button
              aria-label="Cerrar sesión"
              className="hover:bg-muted grid size-10 place-items-center rounded-xl"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </header>

      {banner}
      <main className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:pt-8 lg:px-10 lg:pb-12">
        {children}
      </main>
      <BottomNav nav={nav} keys={navKeys} />
    </div>
  );
}
