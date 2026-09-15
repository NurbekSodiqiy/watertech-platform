export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-surface-alt" />

      <div className="h-10 w-64 animate-pulse rounded-lg bg-surface-alt" />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-40 animate-pulse rounded-2xl border border-border bg-surface" />
        <div className="h-40 animate-pulse rounded-2xl border border-border bg-surface" />
      </div>

      <div className="h-56 animate-pulse rounded-2xl border border-border bg-surface" />
    </div>
  );
}
