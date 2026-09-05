import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { getBreadcrumbs } from "@/lib/site-config";

export function Breadcrumbs({ path }: { path: string }) {
  const crumbs = getBreadcrumbs(path);

  return (
    <nav className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-text-secondary">
      <Link href="/" className="flex shrink-0 items-center gap-1 hover:text-primary-dark">
        <Home size={13} />
      </Link>
      {crumbs.map((c, i) => (
        <span key={c.path} className="flex min-w-0 items-center gap-1.5">
          <ChevronRight size={13} className="shrink-0 opacity-50" />
          {i === crumbs.length - 1 ? (
            <span className="truncate font-medium text-primary-dark">{c.title}</span>
          ) : (
            <Link href={c.path} className="shrink-0 hover:text-primary-dark">
              {c.title}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
