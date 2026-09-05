import { PlayCircle } from "lucide-react";
import { DocPageTemplate } from "./DocPageTemplate";
import { findNode, getMockMeta } from "@/lib/site-config";

export function PageRenderer({ path }: { path: string }) {
  const node = findNode(path);
  const title = node?.title ?? path;
  const meta = getMockMeta(path);

  if (node?.contentType === "video") {
    return (
      <DocPageTemplate path={path} title={title} description={node.description} meta={meta} locked={node.locked}>
        <div className="space-y-4">
          <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border bg-surface-alt text-text-secondary">
            <PlayCircle size={32} />
          </div>
          <p className="text-center text-[13px] italic text-text-secondary">
            [Video placeholder — embed the real recording here.]
          </p>
        </div>
      </DocPageTemplate>
    );
  }

  if (node?.contentType === "checklist") {
    return (
      <DocPageTemplate path={path} title={title} description={node.description} meta={meta} locked={node.locked}>
        <ul className="space-y-2">
          {["[Placeholder checklist item 1]", "[Placeholder checklist item 2]", "[Placeholder checklist item 3]", "[Placeholder checklist item 4]"].map(
            (item, i) => (
              <li key={i} className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-alt px-3 py-2.5 text-[13.5px] text-text-secondary">
                <input type="checkbox" className="h-4 w-4 rounded border-border accent-primary" disabled />
                {item}
              </li>
            )
          )}
        </ul>
      </DocPageTemplate>
    );
  }

  return (
    <DocPageTemplate path={path} title={title} description={node?.description} meta={meta} locked={node?.locked} />
  );
}
