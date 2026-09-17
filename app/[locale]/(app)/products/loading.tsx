import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <Skeleton className="h-8 w-64" />

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface">
            <Skeleton className="h-48 w-full rounded-none" />
            <div className="p-4">
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
