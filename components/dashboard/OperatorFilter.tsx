import { createClient } from "@/lib/supabase/server";
import type { DashboardRange } from "@/lib/dashboard/range";

/** Server component: reads the operator list with the session client — the
 * "allowed_users_manager_select_all" RLS policy (0005_dashboard_policies.sql)
 * is what lets a manager's own session see every row here, not just their
 * own. A plain GET form (carries from/to as hidden fields so the operator
 * filter never resets the range) rather than a client `<select onChange>` —
 * no client state, per the dashboard task's filter rule. */
export async function OperatorFilter({ range, basePath }: { range: DashboardRange; basePath: string }) {
  const { data, error } = await createClient()
    .from("allowed_users")
    .select("email")
    .eq("role", "operator")
    .order("email");

  const operators = error ? [] : (data ?? []);

  return (
    <form method="get" action={basePath} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="from" value={range.from} />
      <input type="hidden" name="to" value={range.to} />
      <select
        name="op"
        defaultValue={range.operatorEmail ?? ""}
        className="rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-[12.5px] text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light"
      >
        <option value="">Barcha operatorlar</option>
        {operators.map((op) => (
          <option key={op.email} value={op.email}>
            {op.email}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium text-primary-dark transition-colors hover:bg-surface-alt"
      >
        Qo&apos;llash
      </button>
    </form>
  );
}
