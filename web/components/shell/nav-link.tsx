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
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-white/10 font-medium text-white"
                : "text-navy-100/70 hover:bg-white/5 hover:text-white",
            )}
          >
            <item.icon className="size-4" />
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
    <nav className="bg-card/95 fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-lg overflow-x-auto">
        {items.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-16 flex-1 flex-col items-center gap-0.5 px-2 py-2 text-[11px]",
                active ? "text-navy-500 dark:text-navy-300 font-medium" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
