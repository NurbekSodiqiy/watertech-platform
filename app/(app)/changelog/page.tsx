import { PageHeader } from "@/components/DocPageTemplate";
import { changelogEntries } from "@/lib/mock-data/changelog";

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <PageHeader
        path="/changelog"
        title="O'zgarishlar tarixi"
        description="Nima o'zgardi, qachon o'zgardi, kim tasdiqladi va kim o'qib chiqdi."
      />
      <div className="space-y-0">
        {changelogEntries.map((c, i) => (
          <div key={c.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
              {i < changelogEntries.length - 1 && <span className="my-1 w-px flex-1 bg-border" />}
            </div>
            <div className="flex-1 pb-6">
              <p className="text-[12px] font-medium text-text-secondary">{c.date}</p>
              <p className="text-[14px] text-primary-dark">{c.whatChanged}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-text-secondary">
                {c.linkedPage && (
                  <>
                    <a href={c.linkedPage} className="text-primary hover:underline">
                      {c.linkedPage}
                    </a>
                    <span>·</span>
                  </>
                )}
                <span>Tasdiqlagan: {c.approvedBy}</span>
                <span className="rounded-full border border-border bg-surface-alt px-2 py-0.5">
                  O&apos;qildi: {c.readCount}
                </span>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" className="h-3.5 w-3.5 rounded border-border accent-primary" disabled />
                  O&apos;qidim
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
