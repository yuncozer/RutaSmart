import Link from "next/link";
import { KeyRound, LogOut } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { BottomNav, SidebarNav, type NavName } from "./nav-link";

/**
 * Estructura común: sidebar azul marino en escritorio,
 * barra superior + navegación inferior en móvil (mobile first).
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
    <div className="min-h-dvh lg:pl-64">
      <aside className="bg-navy-950 fixed inset-y-0 left-0 hidden w-64 flex-col p-4 lg:flex">
        <Link href={homeHref} className="mb-6 px-2 py-1">
          <Logo light />
        </Link>
        {title ? (
          <p className="text-navy-100/40 mb-2 px-3 text-xs uppercase tracking-wider">{title}</p>
        ) : null}
        <SidebarNav nav={nav} keys={navKeys} />
        <div className="mt-auto rounded-xl bg-white/5 p-3">
          <p className="truncate text-sm font-medium text-white">{userName}</p>
          {userDetail ? <p className="text-navy-100/60 truncate text-xs">{userDetail}</p> : null}
          <Link
            href="/actualizar-clave"
            className="text-navy-100/70 mt-2 flex items-center gap-2 text-xs hover:text-white"
          >
            <KeyRound className="size-3" /> Cambiar contraseña
          </Link>
          <form action="/auth/salir" method="post" className="mt-1.5">
            <button className="text-navy-100/70 flex items-center gap-2 text-xs hover:text-white">
              <LogOut className="size-3" /> Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <header className="bg-background/90 sticky top-0 z-20 flex h-14 items-center justify-between border-b px-4 backdrop-blur lg:px-8">
        <Link href={homeHref} className="lg:hidden">
          <Logo />
        </Link>
        <div className="text-muted-foreground hidden text-sm lg:block">{userDetail}</div>
        <div className="flex items-center gap-1">
          {topRight}
          <ThemeToggle />
          <Link
            href="/actualizar-clave"
            aria-label="Cambiar contraseña"
            title="Cambiar contraseña"
            className="hover:bg-muted grid size-10 place-items-center rounded-lg lg:hidden"
          >
            <KeyRound className="size-4" />
          </Link>
          <form action="/auth/salir" method="post" className="lg:hidden">
            <button
              aria-label="Cerrar sesión"
              className="hover:bg-muted grid size-10 place-items-center rounded-lg"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </header>

      {banner}
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 lg:px-8 lg:pb-10">{children}</main>
      <BottomNav nav={nav} keys={navKeys} />
    </div>
  );
}
