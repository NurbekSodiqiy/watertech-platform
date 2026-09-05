import { PlayCircle } from "lucide-react";
import { PageHeader } from "@/components/DocPageTemplate";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { getMockMeta } from "@/lib/site-config";

const videos = [
  { title: "[Placeholder — Great discovery call]", tag: "Discovery" },
  { title: "[Placeholder — Objection handled well]", tag: "Objections" },
  { title: "[Placeholder — Clean close]", tag: "Closing" },
  { title: "[Placeholder — Upsell conversation]", tag: "Upsell" },
];

export default function BestCallsLibraryPage() {
  const meta = getMockMeta("/academy/best-calls-library");
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <PageHeader
        path="/academy/best-calls-library"
        title="Best Calls Library"
        description="Real call recordings worth learning from."
        meta={meta}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {videos.map((v) => (
          <div key={v.title} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
            <div className="flex h-32 items-center justify-center bg-surface-alt text-text-secondary">
              <PlayCircle size={28} />
            </div>
            <div className="p-3">
              <p className="text-[13.5px] font-medium text-primary-dark">{v.title}</p>
              <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                {v.tag}
              </span>
            </div>
          </div>
        ))}
      </div>
      <FeedbackWidget />
    </div>
  );
}
