"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { Search } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { siteTree } from "@/lib/site-config";
import type { NavNode } from "@/lib/types";
import { useTrack } from "@/hooks/useTrack";
import { usePins } from "@/hooks/usePins";
import { useResolvedRefs } from "@/hooks/useResolvedRefs";
import { useUserState } from "@/hooks/useUserState";
import { recentsKey } from "@/lib/user-state/keys";
import { createSearcher, resolveSearchPath, type Searcher, type SearchDoc, type SearchResultType } from "@/lib/search";
import { normalizeSearchText } from "@/lib/search/normalize";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/EmptyState";
import { EMPTY_STATES } from "@/lib/empty-states";
import { noTransition, springs } from "@/lib/motion/tokens";

const TITLE_ID = "command-palette-title";

interface SearchItem {
  categoryKey: string;
  titleKey: string;
  path: string;
}

interface ResolvedItem {
  /** Set on the empty-query rows only: which group heading they sit under. */
  group?: "favourites" | "recents";
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

/** Which row is highlighted. Tied to the `results` array it was set for, so a
 * new result list (typing, or the search index arriving) drops back to the
 * first row without animating — the highlight only slides when the index moves. */
interface RowNav {
  index: number;
  animated: boolean;
  results: ResolvedItem[] | null;
}

export function CommandPalette({
  open,
  onClose,
  onAskCopilot,
}: {
  open: boolean;
  onClose: () => void;
  onAskCopilot: (query: string) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [nav, setNav] = useState<RowNav>({ index: 0, animated: false, results: null });
  const router = useRouter();
  const pathname = usePathname();
  const track = useTrack();
  const t = useTranslations("nav");
  const tChrome = useTranslations("chrome");
  const tEmpty = useTranslations("emptyState.searchNoResults");
  const tCommon = useTranslations("common");
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
    sop: tChrome("commandPalette.categories.sop"),
  };

  // Empty query: the operator's own pins and recents. They resolve through
  // the shared content-refs lookup (fetched only once the palette is open) and
  // unknown ids are pruned from the stored lists, same as on the home page.
  const { pins, setPins, status: pinsStatus } = usePins();
  const [recents, setRecents, recentsStatus] = useUserState(
    recentsKey.key,
    recentsKey.schema,
    recentsKey.defaultValue,
    recentsKey
  );
  const favourites = useResolvedRefs(pins, setPins, open && pinsStatus !== "loading");
  const recent = useResolvedRefs(recents, setRecents, open && recentsStatus !== "loading");
  const idleItems = useMemo<ResolvedItem[]>(
    () => [
      ...favourites.items.map(({ ref, content }) => ({
        group: "favourites" as const,
        category: tCommon(`kinds.${ref.kind}`),
        title: content.title,
        path: content.href,
      })),
      ...recent.items.map(({ ref, content }) => ({
        group: "recents" as const,
        category: tCommon(`kinds.${ref.kind}`),
        title: content.title,
        path: content.href,
      })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the array's identity keys the highlight (see RowNav); tCommon is not stable across renders
    [favourites.items, recent.items]
  );
  const idlePending = favourites.pending || recent.pending;

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

  // Escape closing, the focus trap and the enter/exit motion all live in
  // <Dialog> now — this component only owns search.

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

  // The rows the highlight and the arrow keys move over: search results, or
  // (empty query) the favourites and recents.
  const list = results ?? idleItems;
  const navCurrent = nav.results === list;
  const activeIndex = navCurrent ? nav.index : 0;
  const highlightAnimated = navCurrent && nav.animated;

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, list]);

  function moveHighlight(index: number) {
    setNav({ index, animated: true, results: list });
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (list.length === 0 || event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      moveHighlight((activeIndex + step + list.length) % list.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(list[activeIndex].path);
    }
  }

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

  function renderRow(item: ResolvedItem, index: number) {
    const isActive = index === activeIndex;
    return (
      <button
        // A pinned item is usually also a recent one, so the path alone is not unique across groups.
        key={`${item.group ?? "result"}:${item.path}`}
        onClick={() => go(item.path)}
        onMouseMove={() => {
          if (!isActive) moveHighlight(index);
        }}
        data-active={isActive ? "true" : undefined}
        className="relative flex w-full flex-col items-start rounded-xl px-2.5 py-2 text-left"
      >
        {isActive && (
          <m.span
            layoutId="command-palette-active-row"
            className="absolute inset-0 rounded-xl bg-primary/5"
            transition={reduce || !highlightAnimated ? noTransition : springs.snappy}
            aria-hidden
          />
        )}
        <span className="relative text-[11px] font-medium uppercase tracking-wide text-text-secondary">
          {item.category}
        </span>
        <span className="relative text-[14px] font-semibold text-primary-dark">{item.title}</span>
      </button>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy={TITLE_ID}
      containerClassName="z-50 flex items-start justify-center px-4 pt-[12vh]"
      panelClassName="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-soft"
    >
      {/* The input is the palette's visible affordance, so the accessible
          name it's labelled by is off-screen rather than duplicated on it. */}
      <h2 id={TITLE_ID} className="sr-only">
        {tChrome("commandPalette.title")}
      </h2>

      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3.5">
        <Search size={18} className="shrink-0 text-text-secondary" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder={tChrome("topBar.searchPlaceholder")}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-primary-dark placeholder:text-text-secondary focus:outline-none"
        />
        <span className="shrink-0 rounded-md border border-border bg-surface-alt px-1.5 py-0.5 text-[11px] font-medium text-text-secondary">
          ESC
        </span>
      </div>

      <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
        {results ? (
          <>
            <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
              {tChrome("commandPalette.results")}
            </p>
            {/* Never exits — it only gives the highlight pill a presence context of
                its own. Inside <Dialog>'s AnimatePresence, a layoutId element that
                has moved never reports "safe to remove", so closing the palette
                after arrowing through it would hang. */}
            <AnimatePresence initial={false}>
              <div key="rows" className="space-y-0.5">
                {results.length === 0 && indexLoading && (
                  <p className="px-2.5 py-6 text-center text-[13px] text-text-secondary">{tChrome("commandPalette.loading")}</p>
                )}
                {results.length === 0 && !indexLoading && (
                  <EmptyState
                    variant="compact"
                    icon={EMPTY_STATES.searchNoResults.icon}
                    title={tEmpty("title")}
                    reason={tEmpty("reason", { query: query.trim() })}
                    action={{ label: tEmpty("cta"), onClick: () => onAskCopilot(query.trim()) }}
                  />
                )}
                {results.map((item, index) => renderRow(item, index))}
              </div>
            </AnimatePresence>
          </>
        ) : idleItems.length > 0 ? (
          <AnimatePresence initial={false}>
            <div key="rows" className="space-y-0.5">
              {idleItems.map((item, index) => (
                <Fragment key={`${item.group}:${item.path}`}>
                  {item.group !== idleItems[index - 1]?.group && (
                    <p className="px-2.5 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                      {item.group === "favourites" ? tCommon("favourites") : tCommon("recents")}
                    </p>
                  )}
                  {renderRow(item, index)}
                </Fragment>
              ))}
            </div>
          </AnimatePresence>
        ) : (
          <p className="px-2.5 py-6 text-center text-[13px] text-text-secondary">
            {idlePending ? tChrome("commandPalette.loading") : tChrome("commandPalette.startTyping")}
          </p>
        )}
      </div>
    </Dialog>
  );
}
