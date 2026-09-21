import { AlertCircle, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { GateIssue, GateResult } from "@/lib/agents/publish-gate/types";

function severityRank(issue: GateIssue): number {
  return issue.severity === "error" ? 0 : 1;
}

/** Publish-gate findings, blocking errors first. Presentational only — rendered
 * inside GateReportDialog. Error rows use status-outdated, the codebase's
 * error token (see Toaster.tsx); warning rows use status-warning. */
export function GateReport({ result }: { result: GateResult }) {
  const t = useTranslations("admin.gate");
  const issues = [...result.issues].sort((a, b) => severityRank(a) - severityRank(b));
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.length - errorCount;

  return (
    <div className="space-y-2.5">
      <p className="text-[12.5px] text-text-secondary">
        {t("counts", { errors: errorCount, warnings: warningCount })}
      </p>
      <ul className="space-y-1.5">
        {issues.map((issue, index) => {
          const isError = issue.severity === "error";
          const Icon = isError ? AlertTriangle : AlertCircle;
          return (
            <li
              key={`${issue.code}:${issue.field ?? ""}:${index}`}
              className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 ${
                isError ? "border-status-outdated/40 bg-status-outdated/10" : "border-status-warning/40 bg-status-warning/10"
              }`}
            >
              <Icon
                size={14}
                aria-hidden="true"
                className={`mt-0.5 shrink-0 ${isError ? "text-status-outdated" : "text-status-warning"}`}
              />
              <div className="min-w-0 flex-1">
                <p className="break-words text-[13px] text-primary-dark">{issue.message}</p>
                {issue.field && (
                  <span className="mt-1 inline-block max-w-full truncate rounded-full border border-border bg-surface px-2 py-0.5 font-mono text-[11px] text-text-secondary">
                    {issue.field}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
