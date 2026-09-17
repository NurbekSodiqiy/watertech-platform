"use client";

import { useId } from "react";
import { ShieldAlert } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { Dialog } from "@/components/ui/Dialog";
import { GateReport } from "@/components/admin/GateReport";
import type { GateResult } from "@/lib/agents/publish-gate/types";

/** Opens when a publish comes back blocked by the gate (ActionResult.gate).
 * `editHref` is where "Tahrirlashga o'tish" leads from a list or the
 * dashboard; omitted on an edit form, where the button just closes the dialog
 * because the manager is already on the editor. */
export function GateReportDialog({
  result,
  editHref,
  onClose,
}: {
  result: GateResult | null;
  editHref?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();

  function goToEditor() {
    onClose();
    if (editHref) router.push(editHref);
  }

  // `contents` wrapper: every caller renders this inside a space-y-* stack,
  // whose sibling margin would otherwise land on Dialog's fixed inset-0
  // layer and push the backdrop down, leaving a strip of page uncovered.
  return (
    <div className="contents">
      <Dialog
        open={result !== null}
        onClose={onClose}
        labelledBy={titleId}
        describedBy={descriptionId}
        panelClassName="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-surface shadow-soft"
      >
        <div className="flex items-start gap-3 border-b border-border p-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-status-outdated/15 text-status-outdated">
            <ShieldAlert size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p id={titleId} className="text-[14px] font-semibold text-primary-dark">
              Nashr qorovuli to&apos;xtatdi
            </p>
            <p id={descriptionId} className="mt-1 text-[13px] text-text-secondary">
              Quyidagi xatolar tuzatilmaguncha yozuv nashr etilmaydi. Ogohlantirishlar nashrga to&apos;sqinlik qilmaydi.
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">{result && <GateReport result={result} />}</div>

        <div className="flex justify-end gap-2 border-t border-border p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-3.5 py-2 text-[13px] font-medium text-primary-dark transition-colors hover:bg-surface-alt"
          >
            Yopish
          </button>
          <button
            type="button"
            onClick={goToEditor}
            className="rounded-lg bg-primary px-3.5 py-2 text-[13px] font-medium text-surface transition-colors hover:bg-accent-hover"
          >
            Tahrirlashga o&apos;tish
          </button>
        </div>
      </Dialog>
    </div>
  );
}
