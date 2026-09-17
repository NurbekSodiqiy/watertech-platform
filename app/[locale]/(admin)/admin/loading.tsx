import { Skeleton, SkeletonTableRows } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <SkeletonTableRows rows={3} cols={3} />
    </div>
  );
}
