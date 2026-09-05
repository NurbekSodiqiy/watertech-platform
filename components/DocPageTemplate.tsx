import { Breadcrumbs } from "./Breadcrumbs";
import { MetadataBadgeRow } from "./MetadataBadgeRow";
import { StatusLockBadge } from "./StatusLockBadge";
import { FeedbackWidget } from "./FeedbackWidget";
import type { PageMeta } from "@/lib/types";

export function PageHeader({
  path,
  title,
  description,
  meta,
  locked,
}: {
  path: string;
  title: string;
  description?: string;
  meta: PageMeta;
  locked?: boolean;
}) {
  return (
    <div className="space-y-4">
      <Breadcrumbs path={path} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-primary-dark">{title}</h1>
          {description && <p className="mt-1 text-[15px] text-text-secondary">{description}</p>}
        </div>
        {locked && <StatusLockBadge />}
      </div>
      <MetadataBadgeRow meta={meta} />
    </div>
  );
}

export function DocPageTemplate({
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
  meta: PageMeta;
  locked?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <PageHeader path={path} title={title} description={description} meta={meta} locked={locked} />

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
        {children ?? (
          <div className="space-y-3">
            <p className="rounded-lg border border-dashed border-border bg-surface-alt px-4 py-6 text-center text-[13.5px] italic text-text-secondary">
              [Content goes here — this section is a structural placeholder. Replace with the real
              write-up, screenshots, links, or embeds for “{title}”.]
            </p>
          </div>
        )}
      </div>

      <FeedbackWidget />
    </div>
  );
}
