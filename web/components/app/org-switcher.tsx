"use client";

import { useTransition } from "react";
import { switchOrganization } from "@/app/app/actions";

/** Selector de organización (solo si el usuario pertenece a varias). */
export function OrgSwitcher({
  current,
  orgs,
}: {
  current: string;
  orgs: { id: string; name: string }[];
}) {
  const [pending, start] = useTransition();
  if (orgs.length < 2) return null;
  return (
    <select
      aria-label="Organización"
      disabled={pending}
      defaultValue={current}
      onChange={(e) => start(() => switchOrganization(e.target.value))}
      className="border-input bg-card h-9 max-w-40 rounded-lg border px-2 text-sm"
    >
      {orgs.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}
