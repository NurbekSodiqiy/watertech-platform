import { Clock } from "lucide-react";

export function ComingSoon({ title, description }: { title?: string, description?: string }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-border bg-surface p-8 text-center shadow-soft">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-alt border border-border/50">
        <Clock size={32} className="text-text-secondary" />
      </div>
      <h2 className="mb-2 text-[20px] font-bold text-primary-dark">
        {title || "Tez orada"}
      </h2>
      <p className="text-[15px] text-text-secondary">
        {description || "Bu bo'lim tez orada to'ldiriladi."}
      </p>
    </div>
  );
}
