import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

// The directory's own boundary (the generic one of ../loading.tsx is a table).
// Sizes follow PeopleDirectory: header and add button, the five-tile summary
// strip, the tabs and controls, then the card grid (1 / 2 / 3 columns).
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-2 h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonCard key={index} className="h-[5.25rem]" />
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex gap-1.5">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 min-w-[200px] flex-1" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-40" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonCard key={index} className="h-[12.5rem]" />
        ))}
      </div>
    </div>
  );
}
