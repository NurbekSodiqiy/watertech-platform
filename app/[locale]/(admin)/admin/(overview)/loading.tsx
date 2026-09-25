import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

// The overview's own boundary: it sits in the (overview) route group so this
// skeleton shows for /admin only — the CMS pages keep the generic list
// skeleton of ../loading.tsx. Sizes follow page.tsx: header and range pills,
// five StatCards (h-[132px]), then the panels in page order.
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Skeleton className="h-9 w-64 max-w-full" />
            <Skeleton className="mt-1 h-5 w-96 max-w-full" />
          </div>
          <Skeleton className="h-8 w-52" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <SkeletonCard className="h-[132px]" />
        <SkeletonCard className="h-[132px]" />
        <SkeletonCard className="h-[132px]" />
        <SkeletonCard className="h-[132px]" />
        <SkeletonCard className="h-[132px]" />
      </div>

      <SkeletonCard className="h-[26rem]" />

      <div className="grid gap-4 md:grid-cols-2">
        <SkeletonCard className="h-80" />
        <SkeletonCard className="h-80" />
      </div>

      <SkeletonCard className="h-80" />
      <SkeletonCard className="h-96" />
      <SkeletonCard className="h-64" />
    </div>
  );
}
