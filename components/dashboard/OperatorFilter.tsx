import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { TRACKED_ROLES } from "@/lib/auth/claims";
import { isUserRole } from "@/lib/admin/users";
import type { DashboardRange } from "@/lib/dashboard/range";

/** Server component: reads the people the dashboard can filter by — operators
 * and sales managers, the two roles telemetry records (CLAUDE.md §9); the
 * admin records nothing, so is never an option — with the session client. The
 * "allowed_users_manager_select_all" RLS policy (0005, admin-only since 0020)
 * is what lets the admin's own session see every row here, not just their
 * own. A plain GET form (carries from/to as hidden fields so the operator
 * filter never resets the range) rather than a client `<select onChange>` —
 * no client state, per the dashboard task's filter rule. */
export async function OperatorFilter({ range, basePath }: { range: DashboardRange; basePath: string }) {
  const [t, tRoles] = await Promise.all([
    getTranslations("dashboard.operatorFilter"),
    getTranslations("pages.admin.users.roles"),
  ]);
  const { data, error } = await createClient()
    .from("allowed_users")
    .select("email, role")
    .in("role", TRACKED_ROLES)
    .order("email");

  const people = error ? [] : (data ?? []);

  return (
    <form method="get" action={basePath} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="from" value={range.from} />
      <input type="hidden" name="to" value={range.to} />
      <select
        name="op"
        defaultValue={range.operatorEmail ?? ""}
        className="rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-[12.5px] text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light"
      >
        <option value="">{t("all")}</option>
        {people.map((person) => (
          <option key={person.email} value={person.email}>
            {isUserRole(person.role) ? `${person.email} · ${tRoles(person.role)}` : person.email}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium text-primary-dark transition-colors hover:bg-surface-alt"
      >
        {t("apply")}
      </button>
    </form>
  );
}
