import { useTranslations } from "next-intl";
import type { Objection } from "@/lib/content/types";
import { Pressable } from "@/components/motion/Pressable";

/** One-click objection row — shared by the scripts page's left panel and
 * Call Mode, so "look up an objection without digging into an accordion"
 * works the same in both places instead of two copies of this markup. */
export function ObjectionChipRow({
  objections,
  selectedObjectionId,
  onSelect,
}: {
  objections: Objection[];
  selectedObjectionId?: string;
  onSelect: (objection: Objection) => void;
}) {
  const t = useTranslations("scripts");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[12px] font-medium text-text-secondary shrink-0">{t("quickObjections")}</span>
      {objections.map((o) => (
        <Pressable
          key={o.id}
          onClick={() => onSelect(o)}
          className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
            selectedObjectionId === o.id
              ? "border-primary bg-primary text-surface shadow-softer"
              : "border-border bg-surface text-text-secondary hover:border-primary/40 hover:text-primary-dark"
          }`}
        >
          {o.label}
        </Pressable>
      ))}
    </div>
  );
}
