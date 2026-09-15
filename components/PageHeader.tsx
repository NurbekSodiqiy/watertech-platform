import { Breadcrumbs } from "./Breadcrumbs";
import { MetadataBadgeRow } from "./MetadataBadgeRow";
import { StatusLockBadge } from "./StatusLockBadge";
import type { PageMeta } from "@/lib/types";

// Split out of DocPageTemplate.tsx so this can be imported from Client
// Component templates (e.g. ScriptTemplate) too — DocPageTemplate.tsx itself
// imports next-intl/server, which can only ever be pulled into a Server
// Component's module graph.
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
  meta?: PageMeta;
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
      {meta && <MetadataBadgeRow meta={meta} />}
    </div>
  );
}
