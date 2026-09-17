import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <Skeleton className="h-9 w-96" />

      <Skeleton className="h-10 w-80 rounded-[20px]" />

      <div className="grid grid-cols-12 gap-6">
        <SkeletonCard className="col-span-12 h-[400px] md:col-span-8" />
        <SkeletonCard className="col-span-12 h-[400px] md:col-span-4" />
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
    </div>
  );
}
