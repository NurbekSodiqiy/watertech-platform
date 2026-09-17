import { Skeleton, SkeletonTableRows } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div className="space-y-4">
        <Skeleton className="h-4 w-40" />
        <div>
          <Skeleton className="h-10 w-56" />
          <Skeleton className="mt-2 h-5 w-96" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>
      <SkeletonTableRows rows={6} cols={3} />
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  );
}
