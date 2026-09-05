import { Lock } from "lucide-react";

export function StatusLockBadge({ label = "Restricted" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-status-warning/40 bg-status-warning/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-status-warning">
      <Lock size={11} />
      {label}
    </span>
  );
}
