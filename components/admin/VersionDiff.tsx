"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { diffRows, type DiffItem, type DiffLine, type FieldDiff } from "@/lib/admin/diff";
import { contentColumns, type SnapshotRow } from "@/lib/admin/snapshot";

/** How many unchanged lines are kept on each side of a change. A restored
 * script has hundreds of identical lines; the panel is there to show what
 * moved, with just enough around it to place the change. */
const CONTEXT_LINES = 2;

interface RenderedLine extends DiffLine {
  /** Set on the placeholder that stands in for a run of skipped lines. */
  gap?: number;
}

/** Drops the runs of unchanged lines that are more than CONTEXT_LINES away
 * from any change, leaving one marker per gap. */
function withContext(lines: DiffLine[]): RenderedLine[] {
  const keep = new Array<boolean>(lines.length).fill(false);
  lines.forEach((line, index) => {
    if (line.op === "same") return;
    for (let i = Math.max(0, index - CONTEXT_LINES); i <= Math.min(lines.length - 1, index + CONTEXT_LINES); i++) {
      keep[i] = true;
    }
  });

  const out: RenderedLine[] = [];
  let skipped = 0;
  lines.forEach((line, index) => {
    if (keep[index]) {
      if (skipped > 0) {
        out.push({ op: "same", text: "", gap: skipped });
        skipped = 0;
      }
      out.push(line);
      return;
    }
    skipped++;
  });
  if (skipped > 0) out.push({ op: "same", text: "", gap: skipped });
  return out;
}

const LINE_STYLE: Record<DiffLine["op"], string> = {
  added: "bg-status-ok/10 text-primary-dark",
  removed: "bg-status-outdated/10 text-primary-dark",
  same: "text-text-secondary",
};

const LINE_MARKER: Record<DiffLine["op"], string> = { added: "+", removed: "−", same: " " };

const ITEM_STYLE: Record<DiffItem["status"], string> = {
  added: "bg-status-ok/15 text-status-ok",
  removed: "bg-status-outdated/15 text-status-outdated",
  changed: "bg-status-warning/15 text-status-warning",
};

function DiffLines({ lines, skippedLabel }: { lines: DiffLine[]; skippedLabel: (count: number) => string }) {
  const rendered = withContext(lines);
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface-alt">
      {rendered.map((line, index) =>
        line.gap ? (
          <p key={`gap-${index}`} className="px-3 py-1 text-[11px] italic text-text-secondary">
            {skippedLabel(line.gap)}
          </p>
        ) : (
          <p
            key={`${line.op}-${index}-${line.text}`}
            className={`flex gap-2 whitespace-pre-wrap px-3 py-1 text-[12.5px] ${LINE_STYLE[line.op]}`}
          >
            <span aria-hidden className="select-none opacity-60">
              {LINE_MARKER[line.op]}
            </span>
            <span className="min-w-0 flex-1 break-words">{line.text}</span>
          </p>
        )
      )}
    </div>
  );
}

/**
 * What a snapshot would change if it were restored, column by column: a line
 * diff for text, one marker per stage/step for the JSONB trees, and
 * `before → after` for everything else. Pure rendering over lib/admin/diff.ts —
 * both rows are already in the page (the versions list carries its snapshots),
 * so nothing is fetched to open a panel.
 */
export function VersionDiff({ snapshot, current }: { snapshot: SnapshotRow; current: SnapshotRow | null }) {
  const t = useTranslations("admin.versions");
  const diffs = useMemo<FieldDiff[]>(
    () => diffRows(contentColumns(snapshot), current ? contentColumns(current) : {}),
    [snapshot, current]
  );
  const skippedLabel = (count: number): string => t("skippedLines", { count });

  if (diffs.length === 0) {
    return <p className="rounded-xl border border-border bg-surface-alt px-3 py-2 text-[12.5px] text-text-secondary">{t("noChanges")}</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-text-secondary">{current ? t("diffLegend") : t("diffLegendDeleted")}</p>
      {diffs.map((diff) => (
        <div key={diff.column} className="space-y-1.5">
          <p className="text-[12px] font-semibold text-primary-dark">{diff.column}</p>
          {diff.kind === "text" && <DiffLines lines={diff.lines} skippedLabel={skippedLabel} />}
          {diff.kind === "value" && (
            <p className="rounded-xl border border-border bg-surface-alt px-3 py-1.5 text-[12.5px] text-primary-dark">
              <span className="text-text-secondary line-through">{diff.before ?? "—"}</span>
              <span className="px-2 text-text-secondary">→</span>
              <span>{diff.after ?? "—"}</span>
            </p>
          )}
          {diff.kind === "items" && (
            <div className="space-y-2">
              {diff.items.map((item) => (
                <div key={`${diff.column}-${item.key}`} className="space-y-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${ITEM_STYLE[item.status]}`}
                    >
                      {t(`itemStatus.${item.status}`)}
                    </span>
                    <span className="min-w-0 break-words text-[12.5px] text-primary-dark">{item.label}</span>
                  </p>
                  <DiffLines lines={item.lines} skippedLabel={skippedLabel} />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
