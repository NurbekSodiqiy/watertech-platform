import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

export type DeltaUnit = "%" | "pp" | "abs";

/** Change against the previous equal-length period. `null` means there is
 * nothing to compare against (the previous period was zero, or could not be
 * read) and shows a dash — never a made-up "+100%". The direction carries the
 * tone (up = status-ok, down = status-outdated, zero = text-secondary), and
 * the arrow and sign carry it too, so colour is never the only signal. */
export async function DeltaBadge({ value, unit }: { value: number | null; unit: DeltaUnit }) {
  const [t, locale] = await Promise.all([getTranslations("admin.charts.delta"), getLocale()]);
  const context = t("vsPrevious");

  if (value === null) {
    return (
      <span title={t("none")} className="text-[12.5px] font-semibold text-text-secondary">
        —<span className="sr-only">{` ${t("none")}`}</span>
      </span>
    );
  }

  const number = new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "uz-UZ", {
    signDisplay: "exceptZero",
    maximumFractionDigits: 0,
  }).format(value);
  const text = unit === "%" ? t("percent", { value: number }) : unit === "pp" ? t("points", { value: number }) : number;
  const tone = value > 0 ? "text-status-ok" : value < 0 ? "text-status-outdated" : "text-text-secondary";
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;

  return (
    <span title={context} className={`inline-flex items-center gap-0.5 text-[12.5px] font-semibold tabular-nums ${tone}`}>
      <Icon size={13} aria-hidden="true" />
      {text}
      <span className="sr-only">{` ${context}`}</span>
    </span>
  );
}
