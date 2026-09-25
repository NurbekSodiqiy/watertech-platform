import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

// Only the page content suspends here — AdminShell lives in layout.tsx, which
// renders synchronously and is already on screen by the time this shows. Each
// page renders its own PageHeader, so its skeleton opens this one.
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Skeleton className="h-4 w-6" />
        <div>
          <Skeleton className="h-10 w-72 max-w-full" />
          <Skeleton className="mt-1 h-5 w-96 max-w-full" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-56" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SkeletonCard className="h-[104px]" />
        <SkeletonCard className="h-[104px]" />
        <SkeletonCard className="h-[104px]" />
        <SkeletonCard className="h-[104px]" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SkeletonCard className="h-64" />
        <SkeletonCard className="h-64" />
      </div>
    </div>
  );
}
