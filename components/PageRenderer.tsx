import { PlayCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DocPageTemplate } from "./DocPageTemplate";
import { findNode } from "@/lib/site-config";

const CHECKLIST_PLACEHOLDERS = [1, 2, 3, 4];

export async function PageRenderer({ path }: { path: string }) {
  const [tNav, t] = await Promise.all([getTranslations("nav"), getTranslations("docPage")]);
  const node = findNode(path);
  // siteTree holds nav message keys, not text — resolve them here.
  const title = node ? tNav(node.title) : path;
  const description = node?.description ? tNav(node.description) : undefined;

  if (node?.contentType === "video") {
    return (
      <DocPageTemplate path={path} title={title} description={description} locked={node.locked}>
        <div className="space-y-4">
          <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border bg-surface-alt text-text-secondary">
            <PlayCircle size={32} />
          </div>
          <p className="text-center text-[13px] italic text-text-secondary">{t("videoPlaceholder")}</p>
        </div>
      </DocPageTemplate>
    );
  }

  if (node?.contentType === "checklist") {
    return (
      <DocPageTemplate path={path} title={title} description={description} locked={node.locked}>
        <ul className="space-y-2">
          {CHECKLIST_PLACEHOLDERS.map((n) => (
            <li key={n} className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-alt px-3 py-2.5 text-[13.5px] text-text-secondary">
              <input type="checkbox" className="h-4 w-4 rounded border-border accent-primary" disabled />
              {t("checklistItem", { n: String(n) })}
            </li>
          ))}
        </ul>
      </DocPageTemplate>
    );
  }

  return (
    <DocPageTemplate path={path} title={title} description={description} locked={node?.locked} />
  );
}
