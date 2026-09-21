"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { History, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { EmptyState } from "@/components/EmptyState";
import { restoreVersion } from "@/lib/admin/actions/versions";
import { formatRelative } from "@/lib/admin/format";
import { useMounted } from "@/hooks/useMounted";
import { useOnline } from "@/hooks/useOnline";
import { useToast } from "@/hooks/useToast";
import type { ContentVersionRow } from "@/lib/admin/queries";

/** Each row is a pre-edit snapshot (see content_versions in
 * 0002_content_tables.sql) — "Tiklash" writes it back through the same
 * upsert path the edit form uses, which itself snapshots the row's current
 * state first, so a restore is itself undoable. */
export function VersionsList({ table, versions }: { table: string; versions: ContentVersionRow[] }) {
  const router = useRouter();
  const mounted = useMounted();
  const online = useOnline();
  const { toast } = useToast();
  const t = useTranslations("toast");
  const tV = useTranslations("admin.versions");
  const tRel = useTranslations("admin.relativeTime");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleRestore(versionId: number) {
    if (!online) {
      toast({ kind: "error", title: t("offline") });
      return;
    }
    setPendingId(versionId);
    setError(null);
    startTransition(async () => {
      const result = await restoreVersion(table, versionId);
      setPendingId(null);
      if (!result.ok) {
        setError(result.error);
        toast({ kind: "error", title: result.error });
        return;
      }
      toast({ kind: "success", title: t("restored") });
      router.refresh();
    });
  }

  const tEmpty = useTranslations("emptyState.versionsNone");

  if (versions.length === 0) {
    return <EmptyState variant="compact" icon={History} title={tEmpty("title")} reason={tEmpty("reason")} />;
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
              <th className="px-4 py-2.5 font-semibold text-primary-dark">{tV("date")}</th>
              <th className="px-4 py-2.5 font-semibold text-primary-dark">{tV("author")}</th>
              <th className="w-32 px-4 py-2.5 font-semibold text-primary-dark">{tV("action")}</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 text-text-secondary">{mounted ? formatRelative(v.created_at, tRel, locale) : "—"}</td>
                <td className="px-4 py-2.5 text-text-secondary">{v.actor ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => handleRestore(v.id)}
                    disabled={pending && pendingId === v.id}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-surface-alt hover:text-accent disabled:opacity-50"
                  >
                    <RotateCcw size={12} />
                    {pending && pendingId === v.id ? tV("restoring") : tV("restore")}
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
