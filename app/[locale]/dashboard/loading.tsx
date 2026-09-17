import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

// Only the active tab's page content suspends here — DashboardTabs and
// PageHeader live in layout.tsx, which renders synchronously and is already
// on screen by the time this shows, so it isn't duplicated as a skeleton.
export default function Loading() {
  return (
    <div className="space-y-6">
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
