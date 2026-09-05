import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Breadcrumbs } from "./Breadcrumbs";
import { contentTypeIcons, LockIcon } from "@/lib/content-type-icon";
import type { NavNode } from "@/lib/types";

export function SectionLanding({ node }: { node: NavNode }) {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <Breadcrumbs path={node.path} />
      <div>
        <h1 className="text-[32px] font-extrabold tracking-tight text-primary-dark">{node.title}</h1>
        {node.description && <p className="mt-1 text-[15px] text-text-secondary">{node.description}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {node.children?.map((child) => {
          const Icon = contentTypeIcons[child.contentType];
          return (
            <Link
              key={child.path}
              href={child.path}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-soft hover:bg-primary/5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[14px] font-medium text-primary-dark">
                  {child.title}
                  {child.locked && <LockIcon size={11} className="text-status-warning" />}
                </span>
                {child.children && (
                  <span className="block text-[12px] text-text-secondary">
                    {child.children.length} sub-pages
                  </span>
                )}
              </span>
              <ChevronRight size={16} className="shrink-0 text-text-secondary" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
