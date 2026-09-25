import { ShieldCheck } from "lucide-react";
import type { UserRole } from "@/lib/admin/users";

const TONE: Record<UserRole, string> = {
  admin: "bg-primary/10 text-primary",
  manager: "bg-primary/10 text-primary",
  operator: "border border-border bg-surface-alt text-text-secondary",
};

/** The role as a pill — the one look of it across the people directory, the
 * person page and the dashboard list, so an operator and a sales manager are
 * told apart the same way everywhere. `label` is already translated by the
 * caller (this is pure markup, usable from a server or a client component). */
export function RoleBadge({ role, label }: { role: UserRole; label: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONE[role]}`}
    >
      {role === "admin" && <ShieldCheck size={11} aria-hidden="true" />}
      {label}
    </span>
  );
}
