import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { EmptyState } from "@/components/EmptyState";
import { formatDateTime } from "@/lib/admin/format";
import { COPILOT_QUESTION_RETENTION_DAYS, faqPrefillHref, type UnansweredQuestion } from "@/lib/dashboard/copilot";

/** Questions the copilot found nothing for, grouped by normalized text, most
 * asked first. Only the number of distinct operators is shown — never who
 * asked. "FAQ yaratish" opens the FAQ form with the question pre-filled
 * (/admin/faq/new?question=…, the same prefill the Sifat tab's zero-result
 * searches use). */
export async function CopilotUnansweredTable({ items }: { items: UnansweredQuestion[] }) {
  const [t, tEmpty, locale] = await Promise.all([
    getTranslations("dashboard.copilot.unanswered"),
    getTranslations("emptyState.copilotNoUnanswered"),
    getLocale(),
  ]);

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <div>
        <h2 className="text-[15px] font-bold text-primary-dark">{t("heading")}</h2>
        <p className="mt-1 text-[12.5px] text-text-secondary">
          {t("note", { days: COPILOT_QUESTION_RETENTION_DAYS })}
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState variant="inline" stateKey="copilotNoUnanswered" title={tEmpty("title")} reason={tEmpty("reason")} />
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-border">
                <th className="px-2 py-2 font-semibold text-primary-dark">{t("columns.question")}</th>
                <th className="px-2 py-2 font-semibold text-primary-dark">{t("columns.count")}</th>
                <th className="px-2 py-2 font-semibold text-primary-dark">{t("columns.operators")}</th>
                <th className="px-2 py-2 font-semibold text-primary-dark">{t("columns.lastAsked")}</th>
                <th className="px-2 py-2 font-semibold text-primary-dark">
                  <span className="sr-only">{t("columns.action")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.key} className="border-b border-border last:border-0">
                  <td className="max-w-[360px] px-2 py-2.5 text-primary-dark">
                    <span className="line-clamp-2 break-words">{item.question}</span>
                  </td>
                  <td className="px-2 py-2.5">
                    <span className="rounded-full bg-status-warning/15 px-2 py-0.5 text-[11px] font-semibold text-status-warning">
                      {item.count}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-text-secondary">{item.operatorCount}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-text-secondary">
                    {formatDateTime(item.lastAskedIso, locale)}
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <Link
                      href={faqPrefillHref(item.question)}
                      className="whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:bg-surface-alt hover:text-accent"
                    >
                      {t("createFaq")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
