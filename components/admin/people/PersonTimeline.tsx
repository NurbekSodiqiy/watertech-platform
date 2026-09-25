import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/EmptyState";
import { RelativeTime } from "@/components/admin/RelativeTime";
import type { TimelineEntry } from "@/lib/admin/person-page";

/** One line per event, newest first: what the person did, in words, and when.
 * The sentence is `pages.admin.people.events.<type>` with the item's title
 * already resolved (lib/admin/person-page.ts); the time is relative after
 * mount with the absolute date and time on hover (RelativeTime). */
export async function PersonTimeline({ entries }: { entries: readonly TimelineEntry[] }) {
  const [t, tEmpty] = await Promise.all([
    getTranslations("pages.admin.people.events"),
    getTranslations("pages.admin.people.person.timeline.empty"),
  ]);

  if (entries.length === 0) {
    return (
      <EmptyState
        variant="compact"
        stateKey="dashboardNoEvents"
        title={tEmpty("title")}
        reason={tEmpty("reason")}
      />
    );
  }

  return (
    <ol className="divide-y divide-border">
      {entries.map((entry) => (
        <li key={entry.key} className="flex items-start justify-between gap-3 py-2.5">
          <p className="min-w-0 flex-1 break-words text-[13px] text-primary-dark">
            {t(entry.messageKey, entry.values)}
          </p>
          <span className="shrink-0 whitespace-nowrap pt-px text-[12px] text-text-secondary">
            <RelativeTime iso={entry.ts} />
          </span>
        </li>
      ))}
    </ol>
  );
}
