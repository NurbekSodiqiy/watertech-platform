"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { siteTree } from "@/lib/site-config";
import type { NavNode } from "@/lib/types";
import { useTrack } from "@/hooks/useTrack";
import { createSearcher, resolveSearchPath, type Searcher, type SearchDoc, type SearchResultType } from "@/lib/search";
import { normalizeSearchText } from "@/lib/search/normalize";

interface SearchItem {
  categoryKey: string;
  titleKey: string;
  path: string;
}

interface ResolvedItem {
  category: string;
  title: string;
  path: string;
}

function buildIndex(nodes: NavNode[], categoryKey?: string): SearchItem[] {
  const items: SearchItem[] = [];
  for (const node of nodes) {
    const cat = categoryKey ?? node.title;
    items.push({ categoryKey: cat, titleKey: node.title, path: node.path });
    if (node.children) items.push(...buildIndex(node.children, cat));
  }
  return items;
}

const SEARCH_INDEX = buildIndex(siteTree);

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const track = useTrack();
  const t = useTranslations("nav");
  const tChrome = useTranslations("chrome");
  const locale = useLocale();

  // Page-title matches (above) point straight at a URL already, so they're
  // kept as-is; content matches (objection/script-stage/faq/competitor/
  // package text — not just titles) come from the unified lib/search index
  // and get a category label here purely for display grouping.
  const contentCategoryLabel: Record<SearchResultType, string> = {
    objection: tChrome("commandPalette.categories.objection"),
    script_stage: tChrome("commandPalette.categories.script_stage"),
    faq: tChrome("commandPalette.categories.faq"),
    competitor: tChrome("commandPalette.categories.competitor"),
    package: tChrome("commandPalette.categories.package"),
  };

  // Fetched once, on first open, and cached for the rest of the session —
  // search-index docs don't change while an operator is using the app.
  const searcherRef = useRef<Searcher | null>(null);
  const [indexLoading, setIndexLoading] = useState(false);
  const [, forceRerender] = useState(0);

  // Dropping the cached searcher when the chrome locale changes forces the
  // effect below to refetch — an operator who switches Uzbek/Russian mid-
  // session sees matching-language results instead of the first load's.
  useEffect(() => {
    searcherRef.current = null;
  }, [locale]);

  useEffect(() => {
    if (!open || searcherRef.current || indexLoading) return;
    setIndexLoading(true);
    fetch(`/api/search-index?locale=${locale}`)
      .then((res) => (res.ok ? (res.json() as Promise<SearchDoc[]>) : Promise.reject(res)))
      .then((docs) => {
        searcherRef.current = createSearcher(docs);
      })
      .catch(() => {
        // Falls back to page-title-only matches below if this never loads.
      })
      .finally(() => {
        setIndexLoading(false);
        forceRerender((n) => n + 1);
      });
  }, [open, indexLoading, locale]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const t = setTimeout(() => inputRef.current?.focus(), 10);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const results = useMemo(() => {
    if (!query.trim()) return null;
    const q = normalizeSearchText(query);
    const pageMatches: ResolvedItem[] = SEARCH_INDEX.map((i) => ({
      category: t(i.categoryKey),
      title: t(i.titleKey),
      path: i.path,
    })).filter((i) => normalizeSearchText(i.title).includes(q));
    const contentMatches: ResolvedItem[] = (searcherRef.current?.searchAll(query, 8) ?? []).map((r) => ({
      category: contentCategoryLabel[r.type],
      title: r.title,
      path: resolveSearchPath(r.nav),
    }));
    // Page-title matches first (they're exact substring hits, so more
    // confident than a fuzzy content match), de-duplicated by path.
    const seen = new Set<string>();
    const merged: ResolvedItem[] = [];
    for (const item of [...pageMatches, ...contentMatches]) {
      if (seen.has(item.path)) continue;
      seen.add(item.path);
      merged.push(item);
    }
    return merged.slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, searcherRef.current]);

  // Debounced so this logs once per pause in typing, not once per keystroke.
  useEffect(() => {
    if (!query.trim()) return;
    const t = setTimeout(() => {
      track("search", { meta: { query: query.trim(), resultCount: results?.length ?? 0 } });
    }, 400);
    return () => clearTimeout(t);
  }, [query, results, track]);

  function go(path: string) {
    onClose();
    // Same route, only search params changing (e.g. jumping to another
    // script/stage/tab on the scripts page) → pushState, not router.push:
    // Next keeps useSearchParams in sync without a server RSC fetch (see
    // CLAUDE.md section 4). A different route still needs router.push.
    if (path.startsWith(`${pathname}?`)) {
      window.history.pushState(null, "", path);
    } else {
      router.push(path);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
          <motion.div
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-soft"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <div className="flex items-center gap-2.5 border-b border-border px-4 py-3.5">
              <Search size={18} className="shrink-0 text-text-secondary" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tChrome("topBar.searchPlaceholder")}
                className="min-w-0 flex-1 bg-transparent text-[15px] text-primary-dark placeholder:text-text-secondary focus:outline-none"
              />
              <span className="shrink-0 rounded-md border border-border bg-surface-alt px-1.5 py-0.5 text-[11px] font-medium text-text-secondary">
                ESC
              </span>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-2">
              {results ? (
                <>
                  <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                    {tChrome("commandPalette.results")}
                  </p>
                  <div className="space-y-0.5">
                    {results.length === 0 && indexLoading && (
                      <p className="px-2.5 py-6 text-center text-[13px] text-text-secondary">{tChrome("commandPalette.loading")}</p>
                    )}
                    {results.length === 0 && !indexLoading && (
                      <p className="px-2.5 py-6 text-center text-[13px] text-text-secondary">{tChrome("commandPalette.noResults")}</p>
                    )}
                    {results.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => go(item.path)}
                        className="flex w-full flex-col items-start rounded-xl px-2.5 py-2 text-left hover:bg-primary/5"
                      >
                        <span className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
                          {item.category}
                        </span>
                        <span className="text-[14px] font-semibold text-primary-dark">{item.title}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="px-2.5 py-6 text-center text-[13px] text-text-secondary">{tChrome("commandPalette.startTyping")}</p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
