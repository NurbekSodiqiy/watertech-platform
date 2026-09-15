/** Relative-time label for an admin table's "updated_at" column. Callers
 * must only use this after mount (see hooks/useMounted.ts) — it reads
 * Date.now(), which would otherwise produce a server/client hydration
 * mismatch. */
export function formatRelativeUz(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "hozir";
  if (diffMin < 60) return `${diffMin} daqiqa oldin`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour} soat oldin`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 30) return `${diffDay} kun oldin`;
  return new Date(iso).toLocaleDateString("uz-UZ");
}
