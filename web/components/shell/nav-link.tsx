"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bus,
  Cpu,
  CreditCard,
  FileDown,
  HardDriveUpload,
  Home,
  Layers,
  LayoutDashboard,
  MapPin,
  Building2,
  Receipt,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

// Los íconos son componentes: la configuración vive en este archivo de cliente
// y el servidor solo indica qué menú y qué claves mostrar.
const NAVS: Record<"admin" | "app", NavItem[]> = {
  admin: [
    { key: "overview", href: "/admin", label: "Resumen", icon: LayoutDashboard, exact: true },
    { key: "orgs", href: "/admin/organizaciones", label: "Organizaciones", icon: Building2 },
    { key: "buses", href: "/admin/buses", label: "Buses", icon: Bus },
    { key: "devices", href: "/admin/dispositivos", label: "Dispositivos", icon: Cpu },
    { key: "plans", href: "/admin/planes", label: "Planes", icon: Layers },
    { key: "subs", href: "/admin/suscripciones", label: "Suscripciones", icon: Receipt },
    { key: "payments", href: "/admin/pagos", label: "Pagos", icon: CreditCard },
    { key: "firmware", href: "/admin/firmware", label: "Firmware", icon: HardDriveUpload },
  ],
  app: [
    { key: "home", href: "/app", label: "Inicio", icon: Home, exact: true },
    { key: "map", href: "/app/mapa", label: "Mapa", icon: MapPin },
    { key: "reports", href: "/app/reportes", label: "Reportes", icon: FileDown },
    { key: "fleet", href: "/app/flota", label: "Flota", icon: BarChart3 },
    { key: "users", href: "/app/usuarios", label: "Usuarios", icon: Users },
    { key: "subscription", href: "/app/suscripcion", label: "Suscripción", icon: Receipt },
  ],
};

export type NavName = keyof typeof NAVS;

function itemsFor(nav: NavName, keys?: string[]) {
  return keys ? NAVS[nav].filter((i) => keys.includes(i.key)) : NAVS[nav];
}

function isActive(pathname: string, item: NavItem) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");
}

/** Navegación lateral (escritorio). */
export function SidebarNav({ nav, keys }: { nav: NavName; keys?: string[] }) {
  const pathname = usePathname();
  const items = itemsFor(nav, keys);
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-white/10 font-medium text-white ring-1 ring-white/10"
                : "text-white/60 hover:bg-white/5 hover:text-white",
            )}
          >
            {active ? (
              <span className="bg-electric absolute -left-5 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full" />
            ) : null}
            <span
              className={cn(
                "grid size-8 place-items-center rounded-lg transition-colors",
                active
                  ? "from-electric/40 to-cyan/15 bg-gradient-to-br text-white"
                  : "bg-white/5 group-hover:bg-white/10",
              )}
            >
              <item.icon className="size-4" />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Navegación inferior (móvil). Muestra hasta 5 accesos. */
export function BottomNav({ nav, keys }: { nav: NavName; keys?: string[] }) {
  const pathname = usePathname();
  const items = itemsFor(nav, keys);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="bg-navy-950/95 shadow-navy-950/30 mx-auto flex max-w-lg overflow-x-auto rounded-2xl p-1.5 shadow-xl ring-1 ring-white/10 backdrop-blur-xl">
        {items.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-16 flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] transition-colors",
                active ? "bg-white/10 font-medium text-white" : "text-white/55",
              )}
            >
              <item.icon className={cn("size-5", active && "text-electric")} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
