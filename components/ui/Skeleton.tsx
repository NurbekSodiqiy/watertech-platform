/** Loading-state primitives — every size passed in must match the real
 * component it stands in for (measure the actual rendered element), so a
 * loading.tsx never shifts layout once the real page mounts. */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-border/60 ${className}`} />;
}

export function SkeletonText({ lines = 1, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 && lines > 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl border border-border bg-surface ${className}`} />;
}

export function SkeletonTableRows({ rows = 5, cols = 3 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
      <div className="flex items-center gap-4 border-b border-border bg-surface-alt/60 px-4 py-2.5">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-border px-4 py-2.5 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
