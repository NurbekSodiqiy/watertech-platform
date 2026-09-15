"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { History, RotateCcw } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { restoreVersion } from "@/lib/admin/actions/versions";
import { formatRelativeUz } from "@/lib/admin/format";
import { useMounted } from "@/hooks/useMounted";
import type { ContentVersionRow } from "@/lib/admin/queries";

/** Each row is a pre-edit snapshot (see content_versions in
 * 0002_content_tables.sql) — "Tiklash" writes it back through the same
 * upsert path the edit form uses, which itself snapshots the row's current
 * state first, so a restore is itself undoable. */
export function VersionsList({ table, versions }: { table: string; versions: ContentVersionRow[] }) {
  const router = useRouter();
  const mounted = useMounted();
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleRestore(versionId: number) {
    setPendingId(versionId);
    setError(null);
    startTransition(async () => {
      const result = await restoreVersion(table, versionId);
      setPendingId(null);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  if (versions.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Versiyalar tarixi yo'q"
        description="Bu yozuv hali birorta marta tahrirlanmagan."
      />
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl border border-status-outdated/40 bg-status-outdated/10 px-4 py-2.5 text-[13px] text-primary-dark">
          {error}
        </div>
      )}
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-soft">
        <table className="w-full min-w-[480px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-border bg-surface-alt/60">
              <th className="px-4 py-2.5 font-semibold text-primary-dark">Sana</th>
              <th className="px-4 py-2.5 font-semibold text-primary-dark">Muallif</th>
              <th className="w-32 px-4 py-2.5 font-semibold text-primary-dark">Amal</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 text-text-secondary">{mounted ? formatRelativeUz(v.created_at) : "—"}</td>
                <td className="px-4 py-2.5 text-text-secondary">{v.actor ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => handleRestore(v.id)}
                    disabled={pending && pendingId === v.id}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-surface-alt hover:text-accent disabled:opacity-50"
                  >
                    <RotateCcw size={12} />
                    {pending && pendingId === v.id ? "Tiklanmoqda…" : "Tiklash"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
