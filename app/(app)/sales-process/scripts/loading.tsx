export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div className="h-9 w-96 animate-pulse rounded-lg bg-surface-alt" />

      <div className="h-10 w-80 animate-pulse rounded-[20px] bg-surface-alt" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 h-[400px] animate-pulse rounded-2xl border border-border bg-surface md:col-span-8" />
        <div className="col-span-12 h-[400px] animate-pulse rounded-2xl border border-border bg-surface md:col-span-4" />
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-24 animate-pulse rounded-full bg-surface-alt" />
        ))}
      </div>
    </div>
  );
}
