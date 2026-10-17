import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { requireSuperadmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin RutaSmart RU7" },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireSuperadmin();
  return (
    <AppShell
      nav="admin"
      homeHref="/admin"
      title="Administración"
      userName={profile.full_name ?? user.email ?? "Admin"}
      userDetail="Superadmin · RutaSmart RU7"
    >
      {children}
    </AppShell>
  );
}
