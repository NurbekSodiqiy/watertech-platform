import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

// The person page's own boundary. Sizes follow PersonDetail: the back link and
// header card, the range pills, eight StatCards (h-[132px]) and the onboarding
// bar, then the panels in page order.
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <SkeletonCard className="h-[10.5rem] sm:h-[9.5rem]" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-28" />
      </div>

      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <SkeletonCard key={index} className="h-[132px]" />
          ))}
        </div>
        <SkeletonCard className="h-[5.5rem]" />
      </div>

      <SkeletonCard className="h-56" />
      <SkeletonCard className="h-56" />

      <div className="grid gap-4 md:grid-cols-2">
        <SkeletonCard className="h-72" />
        <SkeletonCard className="h-72" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SkeletonCard className="h-[36rem] lg:col-span-2" />
        <div className="space-y-4">
          <SkeletonCard className="h-72" />
          <SkeletonCard className="h-56" />
        </div>
      </div>
    </div>
  );
}
