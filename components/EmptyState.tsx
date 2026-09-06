import { Inbox } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon = Inbox,
  title = "Hozircha kontent yo'q",
  description = "Bu bo'lim joy egallovchi sifatida qo'yilgan. Haqiqiy kontent bilan almashtiring.",
  actionLabel = "+ Kontent qo'shish",
}: {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon size={20} />
      </div>
      <p className="text-sm font-semibold text-primary-dark">{title}</p>
      <p className="max-w-sm text-[13px] text-text-secondary">{description}</p>

      <div className="mt-1 flex w-full max-w-[220px] flex-col items-center gap-2" aria-hidden>
        <span className="h-2.5 w-full rounded-full bg-border/70" />
        <span className="h-2.5 w-4/5 rounded-full bg-border/70" />
        <span className="h-2.5 w-3/5 rounded-full bg-border/70" />
      </div>

      <button
        type="button"
        className="mt-2 rounded-lg bg-primary px-3.5 py-1.5 text-[13px] font-medium text-surface shadow-softer hover:bg-primary-dark"
      >
        {actionLabel}
      </button>
    </div>
  );
}
