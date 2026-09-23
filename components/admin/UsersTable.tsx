"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { ArrowUpDown, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { setActive, setRole } from "@/lib/admin/actions/users";
import { formatRelative } from "@/lib/admin/format";
import { USER_ROLES, isUserRole, type AdminUser, type UserRole } from "@/lib/admin/users";
import type { ActionResult } from "@/lib/admin/errors";
import { useActionError } from "@/hooks/useActionError";
import { useMounted } from "@/hooks/useMounted";
import { useOnline } from "@/hooks/useOnline";
import { useToast } from "@/hooks/useToast";

// Only mounted once "add" is pressed, and not the page's main content.
const AddUserDialog = dynamic(() => import("@/components/admin/AddUserDialog").then((m) => m.AddUserDialog), {
  ssr: false,
});

type RoleFilter = "all" | UserRole;
type StatusFilter = "all" | "active" | "inactive";
type SortKey = "email" | "fullName" | "lastActivityAt";

/** An activate/deactivate waiting for the manager's confirmation. */
interface PendingToggle {
  email: string;
  name: string;
  role: UserRole;
  next: boolean;
}

interface RunOptions {
  success: string;
  onFailure?: () => void;
  onSettled?: () => void;
}

const FILTER_SELECT_CLASS =
  "rounded-lg border border-border bg-surface-alt px-3 py-2 text-[13px] text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light";

function compareUsers(a: AdminUser, b: AdminUser, key: SortKey): number {
  if (key === "lastActivityAt") {
    // Never-active rows sort after every dated one, in either direction's base order.
    if (a.lastActivityAt === b.lastActivityAt) return 0;
    if (a.lastActivityAt === null) return 1;
    if (b.lastActivityAt === null) return -1;
    return a.lastActivityAt.localeCompare(b.lastActivityAt);
  }
  return (a[key] ?? "").localeCompare(b[key] ?? "");
}

/**
 * The allow-list as a table: search, role and status filters, an inline role
 * select, and activate/deactivate behind a ConfirmDialog that says what
 * happens right away. The manager's own row is read-only here — the database
 * refuses a self-demotion anyway (0017, WT461), so offering it would only
 * produce an error.
 *
 * Every write re-validates on the server and again in SQL; nothing this
 * component disables is a protection, only a courtesy.
 */
export function UsersTable({ users, currentEmail }: { users: AdminUser[]; currentEmail: string }) {
  const router = useRouter();
  const mounted = useMounted();
  const online = useOnline();
  const locale = useLocale();
  const { toast } = useToast();
  const describeError = useActionError();
  const t = useTranslations("pages.admin.users");
  const tToast = useTranslations("toast");
  const tFilter = useTranslations("common.table");
  const tFilterEmpty = useTranslations("emptyState.filterNoMatch");
  const tRel = useTranslations("admin.relativeTime");

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  // Kept mounted after the first open so the dialog's exit animation can run.
  const [addMounted, setAddMounted] = useState(false);
  const [confirm, setConfirm] = useState<PendingToggle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  // The role a select was just changed to, shown until the refreshed rows
  // arrive — otherwise the select snaps back to the old role mid-save.
  const [roleOverrides, setRoleOverrides] = useState<Record<string, UserRole>>({});

  useEffect(() => {
    setRoleOverrides({});
  }, [users]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const out = users.filter(
      (user) =>
        (roleFilter === "all" || user.role === roleFilter) &&
        (statusFilter === "all" || user.isActive === (statusFilter === "active")) &&
        (!needle || user.email.toLowerCase().includes(needle) || (user.fullName ?? "").toLowerCase().includes(needle))
    );
    if (!sort) return out;
    return [...out].sort((a, b) => compareUsers(a, b, sort.key) * sort.dir);
  }, [users, query, roleFilter, statusFilter, sort]);

  const filtersActive = query !== "" || roleFilter !== "all" || statusFilter !== "all";

  function resetFilters() {
    setQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
  }

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev?.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  }

  function guardOnline(): boolean {
    if (online) return true;
    toast({ kind: "error", title: tToast("offline") });
    return false;
  }

  function run(email: string, action: () => Promise<ActionResult>, options: RunOptions) {
    setPendingEmail(email);
    setError(null);
    startTransition(async () => {
      const result = await action();
      setPendingEmail(null);
      options.onSettled?.();
      if (!result.ok) {
        options.onFailure?.();
        const { title } = describeError(result);
        setError(title);
        toast({ kind: "error", title });
        // The allow-list row did change; only the Supabase Auth half needs a
        // retry, and the table should show the row as it now is.
        if (result.code === "auth_sync_failed") router.refresh();
        return;
      }
      toast({ kind: "success", title: options.success });
      router.refresh();
    });
  }

  function changeRole(user: AdminUser, value: string) {
    if (!isUserRole(value) || value === user.role) return;
    if (!guardOnline()) return;
    setRoleOverrides((prev) => ({ ...prev, [user.email]: value }));
    run(user.email, () => setRole(user.email, value), {
      success: t("toastRoleChanged"),
      onFailure: () =>
        setRoleOverrides((prev) => {
          const rest = { ...prev };
          delete rest[user.email];
          return rest;
        }),
    });
  }

  function confirmToggle() {
    if (!confirm || !guardOnline()) return;
    const { email, next } = confirm;
    run(email, () => setActive(email, next), {
      success: next ? t("toastActivated") : t("toastDeactivated"),
      onSettled: () => setConfirm(null),
    });
  }

  function openAdd() {
    setAddMounted(true);
    setAddOpen(true);
  }

  function sortHeader(key: SortKey, label: string) {
    return (
      <button type="button" onClick={() => toggleSort(key)} className="flex items-center gap-1 hover:text-primary">
        {label}
        <ArrowUpDown size={11} className="opacity-60" />
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-status-outdated/40 bg-status-outdated/10 px-4 py-2.5 text-[13px] text-primary-dark"
        >
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tFilter("filterPlaceholder")}
            aria-label={tFilter("filterPlaceholder")}
            className="w-full rounded-lg border border-border bg-surface-alt py-2 pl-8 pr-3 text-[13px] text-primary-dark placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            const value = e.target.value;
            setRoleFilter(isUserRole(value) ? value : "all");
          }}
          aria-label={t("filters.role")}
          className={FILTER_SELECT_CLASS}
        >
          <option value="all">{t("filters.allRoles")}</option>
          {USER_ROLES.map((role) => (
            <option key={role} value={role}>
              {t(`roles.${role}`)}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            const value = e.target.value;
            setStatusFilter(value === "active" || value === "inactive" ? value : "all");
          }}
          aria-label={t("filters.status")}
          className={FILTER_SELECT_CLASS}
        >
          <option value="all">{t("filters.allStatuses")}</option>
          <option value="active">{t("status.active")}</option>
          <option value="inactive">{t("status.inactive")}</option>
        </select>
        <button
          type="button"
          onClick={openAdd}
          className="shrink-0 rounded-lg bg-primary px-3.5 py-2 text-[13px] font-medium text-surface transition-colors hover:bg-accent-hover"
        >
          {t("add")}
        </button>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          variant="compact"
          title={tFilterEmpty("title")}
          reason={tFilterEmpty("reason")}
          action={filtersActive ? { label: tFilterEmpty("cta"), onClick: resetFilters } : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-soft">
          <table className="w-full min-w-[880px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-border bg-surface-alt/60">
                <th className="px-4 py-2.5 font-semibold text-primary-dark">{sortHeader("email", t("columns.email"))}</th>
                <th className="px-4 py-2.5 font-semibold text-primary-dark">{sortHeader("fullName", t("columns.name"))}</th>
                <th className="px-4 py-2.5 font-semibold text-primary-dark">{t("columns.role")}</th>
                <th className="px-4 py-2.5 font-semibold text-primary-dark">{t("columns.status")}</th>
                <th className="px-4 py-2.5 font-semibold text-primary-dark">
                  {sortHeader("lastActivityAt", t("columns.lastActivity"))}
                </th>
                <th className="px-4 py-2.5 font-semibold text-primary-dark">{t("columns.onboarding")}</th>
                <th className="w-40 px-4 py-2.5 font-semibold text-primary-dark">{t("columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((user) => {
                const isSelf = user.email.toLowerCase() === currentEmail;
                const busy = pending && pendingEmail === user.email;
                const displayName = user.fullName ?? user.email;
                return (
                  <tr key={user.email} className="border-b border-border last:border-0 hover:bg-primary/5">
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-primary-dark">{user.email}</span>
                      {isSelf && (
                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                          {t("you")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary">{user.fullName ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <select
                        value={roleOverrides[user.email] ?? user.role}
                        onChange={(e) => changeRole(user, e.target.value)}
                        disabled={isSelf || busy}
                        aria-label={t("roleSelectLabel", { email: user.email })}
                        title={isSelf ? t("selfLocked") : undefined}
                        className="rounded-lg border border-border bg-surface-alt px-2 py-1 text-[12.5px] text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light disabled:opacity-60"
                      >
                        {USER_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {t(`roles.${role}`)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      {/* text-primary-dark, not text-status-*: the tinted status
                          text is 2.9–3.1:1 in the light theme (docs/AUDIT.md,
                          finding 9), and this word is what the manager reads. */}
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold text-primary-dark ${
                          user.isActive ? "bg-status-ok/15" : "bg-status-outdated/15"
                        }`}
                      >
                        {user.isActive ? t("status.active") : t("status.inactive")}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary">
                      {!mounted
                        ? "—"
                        : user.lastActivityAt
                          ? formatRelative(user.lastActivityAt, tRel, locale)
                          : t("noActivity")}
                    </td>
                    <td className="px-4 py-2.5">
                      {user.role === "operator" ? (
                        <Link
                          href={`/dashboard/quality?op=${encodeURIComponent(user.email)}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {t("onboardingLink")}
                        </Link>
                      ) : (
                        <span className="text-text-secondary">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          setConfirm({ email: user.email, name: displayName, role: user.role, next: !user.isActive })
                        }
                        disabled={isSelf || busy}
                        title={isSelf ? t("selfLocked") : undefined}
                        className={`rounded-lg border border-border bg-surface px-2 py-1 text-[11px] font-medium text-text-secondary transition-colors disabled:opacity-50 ${
                          user.isActive
                            ? "hover:bg-status-outdated/10 hover:text-status-outdated"
                            : "hover:bg-surface-alt hover:text-accent"
                        }`}
                      >
                        {user.isActive ? t("deactivate") : t("activate")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.next ? t("activateTitle") : t("deactivateTitle")}
        description={
          confirm
            ? confirm.next
              ? t("activateDescription", { name: confirm.name, role: t(`roles.${confirm.role}`) })
              : t("deactivateDescription", { name: confirm.name })
            : ""
        }
        confirmLabel={confirm?.next ? t("activate") : t("deactivate")}
        tone={confirm?.next ? "primary" : "danger"}
        pending={pending && pendingEmail === confirm?.email}
        onConfirm={confirmToggle}
        onCancel={() => setConfirm(null)}
      />

      {addMounted && <AddUserDialog open={addOpen} onClose={() => setAddOpen(false)} />}
    </div>
  );
}
