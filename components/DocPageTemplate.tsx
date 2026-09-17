import { getTranslations } from "next-intl/server";
import { PageHeader } from "./PageHeader";
import { FeedbackWidget } from "./FeedbackWidget";
import { WidgetBoundary } from "@/components/ui/WidgetBoundary";
import type { PageMeta } from "@/lib/types";

export async function DocPageTemplate({
  path,
  title,
  description,
  meta,
  locked,
  children,
}: {
  path: string;
  title: string;
  description?: string;
  meta?: PageMeta;
  locked?: boolean;
  children?: React.ReactNode;
}) {
  const t = await getTranslations("docPage");

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <PageHeader path={path} title={title} description={description} meta={meta} locked={locked} />

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
        {children ?? (
          <div className="space-y-3">
            <p className="rounded-lg border border-dashed border-border bg-surface-alt px-4 py-6 text-center text-[13.5px] italic text-text-secondary">
              {t("placeholder", { title })}
            </p>
          </div>
        )}
      </div>

      <WidgetBoundary>
        <FeedbackWidget />
      </WidgetBoundary>
    </div>
  );
}
