import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/EmptyState";
import type { OnboardingProgressRow } from "@/lib/dashboard/quality";

/** Server component: how far each operator has got through the 4-day
 * onboarding checklist, which used to live only in their own browser and was
 * therefore invisible to their manager (see supabase/migrations/
 * 0009_user_state.sql). Read-only — a manager can see the rows, never edit
 * them. Least advanced first, so the people who need a nudge are at the top. */
export async function OnboardingProgressTable({ rows }: { rows: OnboardingProgressRow[] }) {
  const t = await getTranslations("dashboard.onboardingProgress");
  const tEmpty = await getTranslations("emptyState.dashboardNoOperators");
  const locale = await getLocale();
  const dateLocale = locale === "ru" ? "ru-RU" : "uz-UZ";

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <h2 className="text-[15px] font-bold text-primary-dark">{t("heading")}</h2>
      {rows.length === 0 ? (
        <EmptyState variant="inline" stateKey="dashboardNoOperators" title={tEmpty("title")} reason={tEmpty("reason")} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="px-1 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                  {t("operator")}
                </th>
                <th className="px-1 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                  {t("progress")}
                </th>
                {/* Below sm the date moves under the email instead, so three
                    columns never have to share 375px. */}
                <th className="hidden px-1 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-text-secondary sm:table-cell">
                  {t("lastUpdate")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const done = row.total > 0 && row.completed === row.total;
                const updated = row.updatedAtIso ? new Date(row.updatedAtIso).toLocaleDateString(dateLocale) : t("never");
                return (
                  <tr key={row.email} className="border-b border-border last:border-0">
                    <td className="px-1 py-2.5">
                      <span className="block max-w-[170px] truncate text-[13px] font-medium text-primary-dark sm:max-w-none">
                        {row.email}
                      </span>
                      <span className="block text-[11.5px] text-text-secondary sm:hidden">{updated}</span>
                    </td>
                    <td className="px-1 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-surface-alt">
                          <span
                            className={`block h-full rounded-full ${done ? "bg-status-ok" : "bg-accent"}`}
                            style={{ width: `${row.total > 0 ? (row.completed / row.total) * 100 : 0}%` }}
                          />
                        </span>
                        <span
                          className={`shrink-0 text-[12.5px] font-semibold ${done ? "text-status-ok" : "text-text-secondary"}`}
                        >
                          {row.completed} / {row.total}
                        </span>
                      </div>
                    </td>
                    <td className="hidden px-1 py-2.5 text-right text-[12px] text-text-secondary sm:table-cell">
                      {updated}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
