"use client";

import { Pin } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { EmptyState } from "@/components/EmptyState";
import { PinButton } from "@/components/ui/PinButton";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { usePins } from "@/hooks/usePins";
import { useResolvedRefs } from "@/hooks/useResolvedRefs";

const SKELETON_CARDS = 3;

export function Favourites() {
  const t = useTranslations("pages.home.favourites");
  const tCommon = useTranslations("common");
  const { pins, setPins, status } = usePins();
  const ready = status !== "loading";
  const { items, pending, failed } = useResolvedRefs(pins, setPins, ready);

  // Same-size placeholders: the real cards are the same fixed height, and once
  // the pins have hydrated there is one placeholder per pin.
  if (!ready || pending) {
    const count = ready ? pins.length : SKELETON_CARDS;
    return (
      <section>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{tCommon("favourites")}</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: count }, (_, i) => (
            <SkeletonCard key={i} className="h-20" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{tCommon("favourites")}</p>
      {pins.length === 0 || (items.length === 0 && !failed) ? (
        <EmptyState variant="inline" icon={Pin} title={t("emptyTitle")} reason={t("emptyReason")} />
      ) : failed ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface px-4 py-4 text-[13px] text-text-secondary">
          {t("loadFailed")}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ ref, content }) => (
            <div
              key={`${ref.kind}:${ref.id}`}
              className="flex h-20 items-center rounded-2xl border border-border bg-surface shadow-soft hover:bg-primary/5"
            >
              <Link href={content.href} className="min-w-0 flex-1 px-4 py-3">
                <span className="block text-[11px] font-medium uppercase tracking-wide text-text-secondary">
                  {tCommon(`kinds.${ref.kind}`)}
                </span>
                <span className="line-clamp-2 text-[14px] font-semibold text-primary-dark">{content.title}</span>
              </Link>
              <PinButton kind={ref.kind} id={ref.id} className="mr-3" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
