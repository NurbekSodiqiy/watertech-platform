"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "@/i18n/routing";
import { ChevronDown, ChevronRight, History, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { EmptyState } from "@/components/EmptyState";
import { restoreVersion } from "@/lib/admin/actions/versions";
import { formatRelative } from "@/lib/admin/format";
import { isSnapshotRow, type SnapshotRow } from "@/lib/admin/snapshot";
import { useMounted } from "@/hooks/useMounted";
import { useOnline } from "@/hooks/useOnline";
import { useToast } from "@/hooks/useToast";
import { useActionError } from "@/hooks/useActionError";
import type { ContentVersionRow } from "@/lib/admin/queries";

// The diff panel only exists once a manager opens one, and it carries the
// whole LCS helper with it — CLAUDE.md section 4 ("lazy by default").
const VersionDiff = dynamic(() => import("@/components/admin/VersionDiff").then((m) => m.VersionDiff), {
  ssr: false,
});

/** Each row is a pre-change snapshot (see content_versions in
 * 0002_content_tables.sql, `op` in 0013): what the row looked like before an
 * update, or what it was when it was deleted.
 *
 * "Tiklash" writes the snapshot's content columns back — never its `status`,
 * so restoring an old published snapshot cannot republish the row behind the
 * publish gate's back — guarded on `currentVersion`, the version of the row
 * this page loaded. The write itself snapshots the row's current state first,
 * so a restore is itself undoable. */
export function VersionsList({
  table,
  versions,
  currentRow,
  currentVersion,
}: {
  table: string;
  versions: ContentVersionRow[];
  /** The row as it is now — the right-hand side of every diff. Null when the
   * row is deleted; a delete snapshot then restores it as a draft. */
  currentRow: SnapshotRow | null;
  currentVersion: number | null;
}) {
  const router = useRouter();
  const mounted = useMounted();
  const online = useOnline();
  const { toast } = useToast();
  const describeError = useActionError();
  const t = useTranslations("toast");
  const tV = useTranslations("admin.versions");
  const tRel = useTranslations("admin.relativeTime");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const openVersion = versions.find((version) => version.id === openId) ?? null;

  function handleRestore(versionId: number) {
    if (!online) {
      toast({ kind: "error", title: t("offline") });
      return;
    }
    setPendingId(versionId);
    setError(null);
    startTransition(async () => {
      const result = await restoreVersion(table, versionId, currentVersion);
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
        <table className="w-full min-w-[560px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-border bg-surface-alt/60">
              <th className="px-4 py-2.5 font-semibold text-primary-dark">{tV("date")}</th>
              <th className="px-4 py-2.5 font-semibold text-primary-dark">{tV("author")}</th>
              <th className="px-4 py-2.5 font-semibold text-primary-dark">{tV("change")}</th>
              <th className="w-56 px-4 py-2.5 font-semibold text-primary-dark">{tV("action")}</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => {
              const open = openId === v.id;
              return (
                <tr
                  key={v.id}
                  className={`border-b border-border align-top last:border-0 ${open ? "bg-primary/5" : ""}`}
                >
                  <td className="px-4 py-2.5 text-text-secondary">
                    {mounted ? formatRelative(v.created_at, tRel, locale) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary">{v.actor ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        v.op === "delete"
                          ? "bg-status-outdated/15 text-status-outdated"
                          : "bg-primary/10 text-primary-dark"
                      }`}
                    >
                      {v.op === "delete" ? tV("opDelete") : tV("opUpdate")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : v.id)}
                        aria-expanded={open}
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-surface-alt hover:text-accent"
                      >
                        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        {tV("diff")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRestore(v.id)}
                        disabled={pending && pendingId === v.id}
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-surface-alt hover:text-accent disabled:opacity-50"
                      >
                        <RotateCcw size={12} />
                        {pending && pendingId === v.id ? tV("restoring") : tV("restore")}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Below the table, not inside it: the table scrolls sideways on a
          phone, and a diff panel in a cell would scroll out of view with it. */}
      {openVersion && (
        <div className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-soft">
          <p className="text-[13px] font-semibold text-primary-dark">
            {tV("diff")}
            <span className="ml-2 font-normal text-text-secondary">
              {mounted ? formatRelative(openVersion.created_at, tRel, locale) : "—"} · {openVersion.actor ?? "—"}
            </span>
          </p>
          {isSnapshotRow(openVersion.snapshot) ? (
            <VersionDiff snapshot={openVersion.snapshot} current={currentRow} />
          ) : (
            <p className="text-[12.5px] text-text-secondary">{tV("snapshotUnreadable")}</p>
          )}
        </div>
      )}
    </div>
  );
}
