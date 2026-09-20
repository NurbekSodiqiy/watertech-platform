import { notFound } from "next/navigation";
import { unstable_setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/PageHeader";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { WidgetBoundary } from "@/components/ui/WidgetBoundary";
import { getSop, getSops } from "@/lib/content/loader";
import type { Locale } from "@/i18n/routing";

// getSops() degrades to [] when Supabase is unreachable (a fresh clone, CI
// without a project), so the build just prerenders nothing and dynamicParams
// renders each SOP on demand.
export async function generateStaticParams() {
  const sops = await getSops();
  return sops.map((s) => ({ slug: s.id }));
}

export const dynamicParams = true;

export default async function AmoSopPage({ params }: { params: { locale: Locale; slug: string } }) {
  unstable_setRequestLocale(params.locale);
  const sop = await getSop(params.locale, params.slug);
  if (!sop) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <PageHeader path={`/tools/amocrm/${params.slug}`} title={sop.title} description={sop.summary} />
      <ol className="space-y-3">
        {sop.steps.map((step, i) => (
          // Steps have no id of their own and are never reordered on this page — position is the identity.
          <li key={i} className="flex gap-3 rounded-2xl border border-border bg-surface p-4 shadow-soft">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[13px] font-semibold text-primary">
              {i + 1}
            </span>
            <div>
              <p className="text-[13.5px] text-primary-dark">{step.title}</p>
              {step.body && (
                <p className="mt-0.5 whitespace-pre-line text-[12.5px] italic text-text-secondary">{step.body}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
      <WidgetBoundary>
        <FeedbackWidget />
      </WidgetBoundary>
    </div>
  );
}
