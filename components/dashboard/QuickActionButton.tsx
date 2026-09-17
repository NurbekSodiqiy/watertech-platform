"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useToast } from "@/hooks/useToast";
import { useOnline } from "@/hooks/useOnline";
import { GateReportDialog } from "@/components/admin/GateReportDialog";
import { VERSION_CONFLICT_MESSAGE } from "@/lib/admin/version-conflict";
import type { ActionResult } from "@/lib/admin/actions/guard";
import type { GateResult } from "@/lib/agents/publish-gate/types";

/** Same pattern as components/admin/DataTable.tsx's row actions: `action` is
 * the bare exported Server Action reference (publishFromDashboard /
 * touchContent), passed straight through from the Server Component parent —
 * this only supplies the row-specific args and handles pending/offline/toast
 * state around the call. */
export function QuickActionButton({
  label,
  pendingLabel,
  successToast,
  action,
  table,
  id,
  version,
  editHref,
}: {
  label: string;
  pendingLabel: string;
  successToast: string;
  action: (table: string, id: string, expectedVersion: number) => Promise<ActionResult>;
  table: string;
  id: string;
  version: number;
  /** Admin editor for this row — where the publish-gate dialog's "Tahrirlashga o'tish" leads. */
  editHref: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("toast");
  const online = useOnline();
  const [pending, startTransition] = useTransition();
  const [gateResult, setGateResult] = useState<GateResult | null>(null);

  function handleClick() {
    if (!online) {
      toast({ kind: "error", title: t("offline") });
      return;
    }
    startTransition(async () => {
      const result = await action(table, id, version);
      if (!result.ok) {
        const isConflict = result.error === VERSION_CONFLICT_MESSAGE;
        if (result.gate) setGateResult(result.gate);
        toast({
          kind: "error",
          title: isConflict ? t("conflict") : result.error,
          action: isConflict ? { label: t("refresh"), onClick: () => router.refresh() } : undefined,
        });
        return;
      }
      toast({ kind: "success", title: successToast });
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="shrink-0 rounded-lg border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:bg-surface-alt hover:text-accent disabled:opacity-50"
      >
        {pending ? pendingLabel : label}
      </button>
      <GateReportDialog result={gateResult} editHref={editHref} onClose={() => setGateResult(null)} />
    </>
  );
}
