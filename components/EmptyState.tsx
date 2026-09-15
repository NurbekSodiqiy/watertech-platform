"use client";

import { Inbox } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

// TODO: "+ Kontent qo'shish" tugmasi haqiqiy kontent-qo'shish oqimi
// qo'shilganda qaytariladi — avvalgi versiyada bu tugma hech qanday
// funksiyaga ega emas edi.
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
}: {
  icon?: LucideIcon;
  title?: string;
  description?: string;
}) {
  const t = useTranslations("emptyState");
  const resolvedTitle = title ?? t("title");
  const resolvedDescription = description ?? t("description");

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon size={20} />
      </div>
      <p className="text-sm font-semibold text-primary-dark">{resolvedTitle}</p>
      <p className="max-w-sm text-[13px] text-text-secondary">{resolvedDescription}</p>

      <div className="mt-1 flex w-full max-w-[220px] flex-col items-center gap-2" aria-hidden>
        <span className="h-2.5 w-full rounded-full bg-border/70" />
        <span className="h-2.5 w-4/5 rounded-full bg-border/70" />
        <span className="h-2.5 w-3/5 rounded-full bg-border/70" />
      </div>
    </div>
  );
}
