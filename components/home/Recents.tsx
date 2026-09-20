"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Skeleton } from "@/components/ui/Skeleton";
import { useResolvedRefs } from "@/hooks/useResolvedRefs";
import { useUserState } from "@/hooks/useUserState";
import { recentsKey } from "@/lib/user-state/keys";

const SKELETON_ROWS = 3;

export function Recents() {
  const t = useTranslations("pages.home.recents");
  const tCommon = useTranslations("common");
  const [recents, setRecents, status] = useUserState(
    recentsKey.key,
    recentsKey.schema,
    recentsKey.defaultValue,
    recentsKey
  );
  const ready = status !== "loading";
  const { items, pending, failed } = useResolvedRefs(recents, setRecents, ready);

  const heading = (
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{tCommon("recents")}</p>
  );

  // Same-size placeholders: rows are a fixed height, one per stored recent
  // once the list has hydrated.
  if (!ready || pending) {
    const rows = ready ? recents.length : SKELETON_ROWS;
    return (
      <section>
        {heading}
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
          {Array.from({ length: rows }, (_, i) => (
            <li key={i} className="flex h-14 items-center px-4 sm:h-11">
              <Skeleton className="h-3 w-1/2" />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section>
      {heading}
      {failed ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface px-4 py-4 text-[13px] text-text-secondary">
          {t("loadFailed")}
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface px-4 py-4 text-[13px] text-text-secondary">
          {t("empty")}
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
          {items.map(({ ref, content }) => (
            <li key={`${ref.kind}:${ref.id}`}>
              <Link
                href={content.href}
                className="flex h-14 flex-col items-start justify-center px-4 hover:bg-primary/5 sm:h-11 sm:flex-row sm:items-center sm:gap-3"
              >
                <span className="max-w-full shrink-0 truncate text-[11px] font-medium uppercase tracking-wide text-text-secondary sm:w-28">
                  {tCommon(`kinds.${ref.kind}`)}
                </span>
                <span className="min-w-0 max-w-full flex-1 truncate text-[14px] font-medium text-primary-dark">{content.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
