import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <Skeleton className="h-8 w-64" />

      <Skeleton className="h-10 w-64" />

      <div className="grid gap-4 sm:grid-cols-2">
        <SkeletonCard className="h-40" />
        <SkeletonCard className="h-40" />
      </div>

      <SkeletonCard className="h-56" />
    </div>
  );
}
