"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { restoreVersion } from "@/lib/admin/actions/versions";
import { formatRelative } from "@/lib/admin/format";
import { useMounted } from "@/hooks/useMounted";
import { useOnline } from "@/hooks/useOnline";
import { useToast } from "@/hooks/useToast";
import { useActionError } from "@/hooks/useActionError";
import type { TrashEntry } from "@/lib/admin/queries";

/** Deleted rows, newest first, with the one action a deleted row has:
 * "Tiklash (qoralama sifatida)". The restore re-inserts the snapshot through
 * the action factory's create path with `status` forced to "draft", so a row
 * that was published when it was deleted does not come back onto the
 * operators' pages — it comes back for a manager to check and publish. */
export function TrashTable({ entries }: { entries: TrashEntry[] }) {
  const router = useRouter();
  const mounted = useMounted();
  const online = useOnline();
  const { toast } = useToast();
  const describeError = useActionError();
  const t = useTranslations("toast");
  const tTrash = useTranslations("pages.admin.trash");
  const tTables = useTranslations("admin.versions.tables");
  const tRel = useTranslations("admin.relativeTime");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleRestore(entry: TrashEntry) {
    if (!online) {
      toast({ kind: "error", title: t("offline") });
      return;
    }
    setPendingId(entry.versionId);
    setError(null);
    startTransition(async () => {
      // No expected version: the point of this page is that the row has none.
      // A row that exists again answers version_conflict, and the refresh
      // below takes it out of the list.
      const result = await restoreVersion(entry.table, entry.versionId, null);
      setPendingId(null);
      if (!result.ok) {
        const { title, isConflict } = describeError(result);
        setError(title);
        toast({
          kind: "error",
          title: isConflict ? t("conflict") : title,
          action: isConflict ? { label: t("refresh"), onClick: () => router.refresh() } : undefined,
        });
        return;
      }
      toast({ kind: "success", title: tTrash("restored") });
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl border border-status-outdated/40 bg-status-outdated/10 px-4 py-2.5 text-[13px] text-primary-dark">
          {error}
        </div>
      )}
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-soft">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-border bg-surface-alt/60">
              <th className="px-4 py-2.5 font-semibold text-primary-dark">{tTrash("columns.table")}</th>
              <th className="px-4 py-2.5 font-semibold text-primary-dark">{tTrash("columns.title")}</th>
              <th className="px-4 py-2.5 font-semibold text-primary-dark">{tTrash("columns.deletedBy")}</th>
              <th className="px-4 py-2.5 font-semibold text-primary-dark">{tTrash("columns.deletedAt")}</th>
              <th className="w-56 px-4 py-2.5 font-semibold text-primary-dark">{tTrash("columns.action")}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.versionId} className="border-b border-border last:border-0 hover:bg-primary/5">
                <td className="px-4 py-2.5 text-text-secondary">{tTables(entry.table)}</td>
                <td className="px-4 py-2.5">
                  <span className="font-medium text-primary-dark">{entry.title}</span>
                  <span className="block text-[12px] text-text-secondary">{entry.rowId}</span>
                </td>
                <td className="px-4 py-2.5 text-text-secondary">{entry.deletedBy ?? "—"}</td>
                <td className="px-4 py-2.5 text-text-secondary">
                  {mounted ? formatRelative(entry.deletedAt, tRel, locale) : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => handleRestore(entry)}
                    disabled={pending && pendingId === entry.versionId}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-surface-alt hover:text-accent disabled:opacity-50"
                  >
                    <RotateCcw size={12} />
                    {pending && pendingId === entry.versionId ? tTrash("restoring") : tTrash("restore")}
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
