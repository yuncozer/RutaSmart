import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { OrgSwitcher } from "@/components/app/org-switcher";
import { SubscriptionBanner, SubscriptionBlocked } from "@/components/app/subscription-gate";
import { requireAppContext } from "@/lib/auth";
import { hasDashboardAccess } from "@/lib/subscription";

export const metadata: Metadata = { title: { default: "Panel", template: "%s · RutaSmart" } };

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAppContext();
  const allowed = hasDashboardAccess(ctx.access.status);
  const navKeys =
    ctx.role === "owner" ? ["home", "reports", "fleet", "users", "subscription"] : ["home"];

  return (
    <AppShell
      nav="app"
      navKeys={allowed ? navKeys : []}
      homeHref="/app"
      title={ctx.access.plan_name ? `Plan ${ctx.access.plan_name}` : undefined}
      userName={ctx.profile.full_name ?? ctx.email}
      userDetail={`${ctx.org.name} · ${ctx.role === "owner" ? "Dueño" : "Conductor"}`}
      banner={allowed ? <SubscriptionBanner ctx={ctx} /> : null}
      topRight={
        <OrgSwitcher
          current={ctx.org.id}
          orgs={ctx.memberships.map((m) => ({ id: m.organization_id, name: m.organization.name }))}
        />
      }
    >
      {allowed ? children : <SubscriptionBlocked ctx={ctx} />}
    </AppShell>
  );
}
