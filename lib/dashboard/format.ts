/** "2 soat 15 daq" / "15 daq" — shared by the Faollik tab's per-operator
 * cards and the KpiGrid's "Jami vaqt" card so the two never drift apart. */
export function formatDurationUz(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} daq`;
  return `${h} soat ${m} daq`;
}
