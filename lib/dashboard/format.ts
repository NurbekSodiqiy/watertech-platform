/** Translator for the two duration shapes — the `dashboard.duration` messages
 * ("15 daq" / "2 soat 15 daq"). Shared by the Faollik tab's per-operator
 * cards and the KpiGrid's "total time" card so the two never drift apart. */
export type DurationTranslator = (key: "minutes" | "hoursMinutes", values: { hours: number; minutes: number }) => string;

export function formatDuration(ms: number, t: DurationTranslator): string {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours === 0 ? t("minutes", { hours, minutes }) : t("hoursMinutes", { hours, minutes });
}
