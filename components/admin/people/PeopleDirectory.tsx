"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import dynamic from "next/dynamic";
import { LayoutGrid, Search, Table2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { UsersTable } from "@/components/admin/UsersTable";
import { PersonCard } from "@/components/admin/people/PersonCard";
import type { RemovePersonTarget } from "@/components/admin/people/RemovePersonDialog";
import { setActive } from "@/lib/admin/actions/users";
import {
  DIRECTORY_QUERY_MAX_LENGTH,
  DIRECTORY_ROLE_TABS,
  DIRECTORY_SORTS,
  DIRECTORY_VIEWS,
  DIRECTORY_WINDOW_DAYS,
  RECENT_ACTIVITY_DAYS,
  buildSearchKeys,
  directorySearch,
  directorySummary,
  filterPeople,
  roleCounts,
  searchTerms,
  sortPeople,
  type DirectoryPerson,
  type DirectoryRoleTab,
  type DirectorySort,
  type DirectoryState,
  type DirectoryView,
} from "@/lib/admin/directory";
import type { UserRole } from "@/lib/admin/users";
import { useActionError } from "@/hooks/useActionError";
import { useNow } from "@/hooks/useNow";
import { useOnline } from "@/hooks/useOnline";
import { useToast } from "@/hooks/useToast";

// Only mounted once "add" is pressed, and not the page's main content — the
// same lazy dialog UsersTable has always used.
const AddUserDialog = dynamic(() => import("@/components/admin/AddUserDialog").then((m) => m.AddUserDialog), {
  ssr: false,
});

// Only mounted once a card's "Remove" is chosen, like the add dialog.
const RemovePersonDialog = dynamic(
  () => import("@/components/admin/people/RemovePersonDialog").then((m) => m.RemovePersonDialog),
  { ssr: false }
);

/** A card's activate / deactivate, waiting for the admin's confirmation. */
interface PendingToggle {
  email: string;
  name: string;
  role: UserRole;
  next: boolean;
}

/** How a dialog names a person: their full name, else their email. */
function dialogName(person: DirectoryPerson): string {
  return person.fullName?.trim() || person.email;
}

/** How long the URL waits after the last change before it is rewritten, so a
 * burst of keystrokes is one history write, not one per letter. */
const URL_WRITE_DELAY_MS = 250;

const CONTROL_CLASS =
  "rounded-lg border border-border bg-surface-alt px-3 py-2 text-[13px] text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light";

function isSort(value: string): value is DirectorySort {
  return DIRECTORY_SORTS.some((sort) => sort === value);
}

export interface PeopleDirectoryProps {
  /** Every allow-list row, joined with the overview (lib/admin/directory.ts). */
  people: DirectoryPerson[];
  /** The Tashkent day (YYYY-MM-DD) the cards' 14-day series starts on. */
  windowStart: string;
  /** The signed-in admin, lowercased — marks their row in the table view. */
  currentEmail: string;
  /** What the URL said when the page was rendered. */
  initialState: DirectoryState;
  /** False when admin_people_overview could not be read: cards then show no numbers. */
  overviewAvailable: boolean;
  /** False when admin_user_last_activity could not be read (table view's column). */
  activityAvailable: boolean;
}

/**
 * "Xodimlar" — the people directory: everyone on the allow-list as a card (or a
 * table row), operators and sales managers told apart by role tabs, a badge and
 * the summary strip. Everything is client-side over the full list the server
 * sent in one round trip (search, role tabs, sort, view), and the state is
 * mirrored to the URL with history.replaceState (CLAUDE.md §4), so a filtered
 * view can be shared and survives a reload.
 *
 * The list grows by itself: a new person is a row of `allowed_users`, the page
 * reads that table on every request, and AddUserDialog calls router.refresh()
 * after a successful add — the fresh `people` prop makes the card appear, in
 * whatever filter and sort the admin had. It shrinks the same way: a card's ⋯
 * menu (operators and sales managers only — never an admin's card, never the
 * signed-in admin's) offers deactivate / activate and remove. The directory
 * owns the one ConfirmDialog and the one RemovePersonDialog those open, and
 * hands every card the same stable callbacks, so the memoized cards stay
 * memoized; a successful change re-reads the page (router.refresh()), which
 * drops a removed card and updates the summary strip.
 */
export function PeopleDirectory({
  people,
  windowStart,
  currentEmail,
  initialState,
  overviewAvailable,
  activityAvailable,
}: PeopleDirectoryProps) {
  const t = useTranslations("pages.admin.people.directory");
  const tUsers = useTranslations("pages.admin.users");
  const tFilterEmpty = useTranslations("emptyState.filterNoMatch");
  const router = useRouter();
  const online = useOnline();
  const { toast } = useToast();
  const describeError = useActionError();
  const tToast = useTranslations("toast");
  const now = useNow(60_000);
  const idBase = useId();

  const [state, setState] = useState<DirectoryState>(initialState);
  const [addOpen, setAddOpen] = useState(false);
  // Kept mounted after the first open so the dialog's exit animation can run.
  const [addMounted, setAddMounted] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  // The card menus' two dialogs. The target outlives `open`, so the text does
  // not blank while a dialog animates out.
  const [toggle, setToggle] = useState<PendingToggle | null>(null);
  const [toggleOpen, setToggleOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<RemovePersonTarget | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeMounted, setRemoveMounted] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [togglePending, startToggle] = useTransition();

  // Floored to the minute: the memoized cards re-render once a minute.
  const nowMs = now === null ? null : Math.floor(now.getTime() / 60_000) * 60_000;

  // Typing stays instant; the list catches up when the browser has time.
  const deferredQuery = useDeferredValue(state.query);
  const terms = useMemo(() => searchTerms(deferredQuery), [deferredQuery]);
  const searchKeys = useMemo(() => buildSearchKeys(people), [people]);
  const summary = useMemo(() => directorySummary(people), [people]);
  const counts = useMemo(() => roleCounts(people, terms, searchKeys), [people, terms, searchKeys]);
  const sorted = useMemo(() => sortPeople(people, state.sort), [people, state.sort]);
  const visible = useMemo(
    () => filterPeople(sorted, state.role, terms, searchKeys),
    [sorted, state.role, terms, searchKeys]
  );

  // State → URL. replaceState, not router.replace: the same route with other
  // search params must not start a server render (CLAUDE.md §4).
  useEffect(() => {
    const search = directorySearch(state);
    const timer = window.setTimeout(() => {
      if (window.location.search === search) return;
      window.history.replaceState(null, "", `${window.location.pathname}${search}${window.location.hash}`);
    }, URL_WRITE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  function patch(change: Partial<DirectoryState>) {
    setState((previous) => ({ ...previous, ...change }));
  }

  // Stable (state setters only), so passing them keeps every PersonCard memoized.
  const requestToggle = useCallback((person: DirectoryPerson) => {
    setActionError(null);
    setToggle({ email: person.email, name: dialogName(person), role: person.role, next: !person.isActive });
    setToggleOpen(true);
  }, []);

  const requestRemove = useCallback((person: DirectoryPerson) => {
    setActionError(null);
    setRemoveTarget({ email: person.email, name: dialogName(person) });
    setRemoveMounted(true);
    setRemoveOpen(true);
  }, []);

  function confirmToggle() {
    if (!toggle) return;
    if (!online) {
      toast({ kind: "error", title: tToast("offline") });
      return;
    }
    const { email, next } = toggle;
    startToggle(async () => {
      const result = await setActive(email, next);
      setToggleOpen(false);
      if (!result.ok) {
        const { title } = describeError(result);
        setActionError(title);
        toast({ kind: "error", title });
        // The allow-list row did change; only the Supabase Auth half needs a
        // retry, and the card should show the row as it now is.
        if (result.code === "auth_sync_failed") router.refresh();
        return;
      }
      toast({ kind: "success", title: next ? tUsers("toastActivated") : tUsers("toastDeactivated") });
      router.refresh();
    });
  }

  function onRemoved() {
    // The card — and the menu button focus would go back to — is about to
    // disappear; the search box is where a keyboard user carries on. Moved
    // before the dialog closes, so its focus trap leaves focus where it is.
    searchRef.current?.focus();
    setRemoveOpen(false);
    router.refresh();
  }

  function openAdd() {
    setAddMounted(true);
    setAddOpen(true);
  }

  function onTabKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const count = DIRECTORY_ROLE_TABS.length;
    const index = DIRECTORY_ROLE_TABS.indexOf(state.role);
    let next: number;
    switch (event.key) {
      case "ArrowRight":
        next = (index + 1) % count;
        break;
      case "ArrowLeft":
        next = (index - 1 + count) % count;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = count - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    patch({ role: DIRECTORY_ROLE_TABS[next] });
    tabRefs.current[next]?.focus();
  }

  function resetFilters() {
    patch({ role: "all", query: "" });
  }

  const tabId = (tab: DirectoryRoleTab): string => `${idBase}-tab-${tab}`;
  const panelId = `${idBase}-panel`;
  const filtersActive = state.role !== "all" || terms.length > 0;
  /** Only the admin is on the list: nobody to measure yet. */
  const noStaff = summary.total === 0;
  const dash = "—";

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[24px] font-bold text-primary-dark">{t("title")}</h1>
          <p className="mt-1 text-[13px] text-text-secondary">{t("description")}</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="shrink-0 rounded-lg bg-primary px-3.5 py-2 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
        >
          {t("add")}
        </button>
      </div>

      {!overviewAvailable && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-status-warning/40 bg-status-warning/10 px-4 py-2.5 text-[13px] text-primary-dark"
        >
          <span>{t("statsUnavailable")}</span>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-[12px] font-medium text-primary-dark transition-colors hover:bg-surface-alt"
          >
            {t("retry")}
          </button>
        </div>
      )}
      {actionError && (
        <div
          role="alert"
          className="rounded-xl border border-status-outdated/40 bg-status-outdated/10 px-4 py-2.5 text-[13px] text-primary-dark"
        >
          {actionError}
        </div>
      )}
      {!activityAvailable && (
        <p className="rounded-xl border border-status-warning/40 bg-status-warning/10 px-4 py-2.5 text-[13px] text-primary-dark">
          {tUsers("activityUnavailable")}
        </p>
      )}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryTile label={t("summary.total")} value={String(summary.total)} />
        <SummaryTile label={t("summary.operators")} value={String(summary.operators)} />
        <SummaryTile label={t("summary.managers")} value={String(summary.managers)} />
        <SummaryTile
          label={t("summary.active", { days: RECENT_ACTIVITY_DAYS })}
          value={summary.active === null ? dash : String(summary.active)}
        />
        <SummaryTile
          label={t("summary.inactive")}
          hint={t("summary.inactiveHint", { days: RECENT_ACTIVITY_DAYS })}
          value={summary.inactive === null ? dash : String(summary.inactive)}
        />
      </dl>

      <div className="space-y-3">
        <div
          role="tablist"
          aria-label={t("tabs.label")}
          onKeyDown={onTabKeyDown}
          className="flex gap-1.5 overflow-x-auto pb-1"
        >
          {DIRECTORY_ROLE_TABS.map((tab, index) => {
            const selected = state.role === tab;
            return (
              <button
                key={tab}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                type="button"
                role="tab"
                id={tabId(tab)}
                aria-selected={selected}
                aria-controls={panelId}
                tabIndex={selected ? 0 : -1}
                onClick={() => patch({ role: tab })}
                className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  selected
                    ? "border-primary bg-primary/10 text-primary-dark"
                    : "border-border bg-surface text-text-secondary hover:bg-surface-alt"
                }`}
              >
                {t(`tabs.${tab}`)}
                <span className="rounded-full bg-surface-alt px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-primary-dark">
                  {counts[tab]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search
              size={14}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
            />
            <input
              ref={searchRef}
              type="search"
              value={state.query}
              onChange={(event) => patch({ query: event.target.value })}
              maxLength={DIRECTORY_QUERY_MAX_LENGTH}
              placeholder={t("search.placeholder")}
              aria-label={t("search.label")}
              autoComplete="off"
              spellCheck={false}
              className={`w-full py-2 pl-8 pr-3 placeholder:text-text-secondary ${CONTROL_CLASS}`}
            />
          </div>

          {state.view === "cards" && (
            <select
              value={state.sort}
              onChange={(event) => {
                const value = event.target.value;
                if (isSort(value)) patch({ sort: value });
              }}
              aria-label={t("sort.label")}
              className={CONTROL_CLASS}
            >
              {DIRECTORY_SORTS.map((sort) => (
                <option key={sort} value={sort}>
                  {t(`sort.${sort}`)}
                </option>
              ))}
            </select>
          )}

          <div
            role="group"
            aria-label={t("view.label")}
            className="inline-flex shrink-0 rounded-lg border border-border bg-surface p-0.5"
          >
            {DIRECTORY_VIEWS.map((view) => (
              <ViewButton
                key={view}
                view={view}
                pressed={state.view === view}
                label={t(`view.${view}`)}
                onSelect={() => patch({ view })}
              />
            ))}
          </div>
        </div>
      </div>

      <p role="status" className="sr-only">
        {t("resultCount", { count: visible.length })}
      </p>

      <div role="tabpanel" id={panelId} aria-labelledby={tabId(state.role)} className="space-y-4">
        {noStaff && (
          <EmptyState
            variant="compact"
            stateKey="dashboardNoOperators"
            title={t("empty.title")}
            reason={t("empty.reason")}
            action={{ label: t("add"), onClick: openAdd }}
          />
        )}

        {visible.length === 0 ? (
          !noStaff && (
            <EmptyState
              variant="compact"
              title={tFilterEmpty("title")}
              reason={tFilterEmpty("reason")}
              action={filtersActive ? { label: tFilterEmpty("cta"), onClick: resetFilters } : undefined}
            />
          )
        ) : state.view === "cards" ? (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((person) => (
              <li key={person.email} className="min-w-0">
                <PersonCard
                  person={person}
                  windowStart={windowStart}
                  nowMs={nowMs}
                  manageable={person.role !== "admin" && person.email.toLowerCase() !== currentEmail}
                  onToggleActive={requestToggle}
                  onRemove={requestRemove}
                />
              </li>
            ))}
          </ul>
        ) : (
          <UsersTable users={visible} currentEmail={currentEmail} hideToolbar />
        )}
      </div>

      <p className="text-[12px] text-text-secondary">{t("windowNote", { days: DIRECTORY_WINDOW_DAYS })}</p>

      {addMounted && <AddUserDialog open={addOpen} onClose={() => setAddOpen(false)} />}

      <ConfirmDialog
        open={toggleOpen}
        title={toggle?.next ? tUsers("activateTitle") : tUsers("deactivateTitle")}
        description={
          toggle
            ? toggle.next
              ? tUsers("activateDescription", { name: toggle.name, role: tUsers(`roles.${toggle.role}`) })
              : tUsers("deactivateDescription", { name: toggle.name })
            : ""
        }
        confirmLabel={toggle?.next ? tUsers("activate") : tUsers("deactivate")}
        tone={toggle?.next ? "primary" : "danger"}
        pending={togglePending}
        onConfirm={confirmToggle}
        onCancel={() => {
          if (!togglePending) setToggleOpen(false);
        }}
      />

      {removeMounted && (
        <RemovePersonDialog
          open={removeOpen}
          person={removeTarget}
          onClose={() => setRemoveOpen(false)}
          onRemoved={onRemoved}
        />
      )}
    </div>
  );
}

function SummaryTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-surface px-4 py-3 shadow-softer">
      <dt className="truncate text-[12.5px] font-medium text-text-secondary">{label}</dt>
      <dd className="mt-1 text-[24px] font-bold leading-none tabular-nums text-primary-dark">{value}</dd>
      {hint && <p className="mt-1.5 truncate text-[12px] text-text-secondary">{hint}</p>}
    </div>
  );
}

function ViewButton({
  view,
  pressed,
  label,
  onSelect,
}: {
  view: DirectoryView;
  pressed: boolean;
  label: string;
  onSelect: () => void;
}) {
  const Icon = view === "cards" ? LayoutGrid : Table2;
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onSelect}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        pressed ? "bg-primary/10 text-primary-dark" : "text-text-secondary hover:bg-surface-alt"
      }`}
    >
      <Icon size={14} aria-hidden="true" />
      {label}
    </button>
  );
}
