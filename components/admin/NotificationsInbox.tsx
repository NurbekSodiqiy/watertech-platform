"use client";

import { memo, useCallback, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, AlertTriangle, Check, CheckCheck, ExternalLink, Info, type LucideIcon } from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { EmptyState } from "@/components/EmptyState";
import { useMounted } from "@/hooks/useMounted";
import { useOnline } from "@/hooks/useOnline";
import { useToast } from "@/hooks/useToast";
import { useActionError } from "@/hooks/useActionError";
import { formatRelative } from "@/lib/admin/format";
import { markAllRead, markRead } from "@/lib/notifications/actions";
import type { NotificationRow, NotificationSeverity } from "@/lib/notifications/types";

const SEVERITY_ICON: Record<NotificationSeverity, LucideIcon> = {
  error: AlertTriangle,
  warning: AlertCircle,
  info: Info,
};

// status-outdated is the codebase's error token (see Toaster.tsx).
const SEVERITY_BADGE_CLASSES: Record<NotificationSeverity, string> = {
  error: "bg-status-outdated/15 text-status-outdated",
  warning: "bg-status-warning/15 text-status-warning",
  info: "bg-primary/10 text-primary",
};

interface NotificationItemProps {
  row: NotificationRow;
  mounted: boolean;
  pending: boolean;
  onMarkRead: (id: number) => void;
}

const NotificationItem = memo(function NotificationItem({ row, mounted, pending, onMarkRead }: NotificationItemProps) {
  const t = useTranslations("admin.notifications");
  const tRel = useTranslations("admin.relativeTime");
  const locale = useLocale();
  const Icon = SEVERITY_ICON[row.severity];
  const unread = row.read_at === null;

  return (
    <li
      className={`flex items-start gap-3 rounded-2xl border border-border px-4 py-3.5 ${
        unread ? "bg-surface shadow-soft" : "bg-surface-alt"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${SEVERITY_BADGE_CLASSES[row.severity]}`}
      >
        <Icon size={15} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label={t("unread")} />}
          <p className="min-w-0 break-words text-[13.5px] font-semibold text-primary-dark">{row.title}</p>
        </div>
        {row.body && (
          <p className="mt-1 whitespace-pre-line break-words text-[13px] text-text-secondary">{row.body}</p>
        )}
        <p className="mt-1.5 text-[12px] text-text-secondary">
          {mounted ? formatRelative(row.created_at, tRel, locale) : "—"} · {t(`kinds.${row.kind}`)}
          {row.actor ? ` · ${row.actor}` : ""}
        </p>
        {(row.href || unread) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {row.href && (
              <Link
                href={row.href}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12.5px] font-medium text-surface transition-colors hover:bg-accent-hover"
              >
                <ExternalLink size={13} />
                {t("open")}
              </Link>
            )}
            {unread && (
              <button
                type="button"
                onClick={() => onMarkRead(row.id)}
                disabled={pending}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium text-primary-dark transition-colors hover:bg-surface-alt disabled:opacity-50"
              >
                <Check size={13} />
                {t("markRead")}
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
});

/** Manager inbox list. The `?unread=1` filter is applied here, on rows the
 * page already loaded (unread first), and toggled with history.pushState —
 * a search-param change on the same route never triggers an RSC round trip
 * (CLAUDE.md section 4). Mark-read actions revalidate server-side and refresh. */
export function NotificationsInbox({ rows }: { rows: NotificationRow[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mounted = useMounted();
  const online = useOnline();
  const { toast } = useToast();
  const describeError = useActionError();
  const tToast = useTranslations("toast");
  const tN = useTranslations("admin.notifications");
  const tEmpty = useTranslations("emptyState.notificationsNone");
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<number | "all" | null>(null);

  const unreadOnly = searchParams.get("unread") === "1";
  const unreadCount = rows.filter((row) => row.read_at === null).length;
  const visible = unreadOnly ? rows.filter((row) => row.read_at === null) : rows;

  function setUnreadOnly(next: boolean) {
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("unread", "1");
    else url.searchParams.delete("unread");
    window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  const runAction = useCallback(
    (target: number | "all", action: () => ReturnType<typeof markAllRead>, successTitle?: string) => {
      if (!online) {
        toast({ kind: "error", title: tToast("offline") });
        return;
      }
      setPendingId(target);
      startTransition(async () => {
        const result = await action();
        setPendingId(null);
        if (!result.ok) {
          toast({ kind: "error", title: describeError(result).title });
          return;
        }
        if (successTitle) toast({ kind: "success", title: successTitle });
        router.refresh();
      });
    },
    [describeError, online, router, toast, tToast]
  );

  const handleMarkRead = useCallback((id: number) => runAction(id, () => markRead(id)), [runAction]);

  if (rows.length === 0) {
    return <EmptyState stateKey="notificationsNone" title={tEmpty("title")} reason={tEmpty("reason")} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-0.5 rounded-full border border-border bg-surface-alt p-1">
          <button
            type="button"
            onClick={() => setUnreadOnly(false)}
            aria-pressed={!unreadOnly}
            className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium ${
              !unreadOnly ? "bg-surface text-primary-dark shadow-softer" : "text-text-secondary hover:text-primary-dark"
            }`}
          >
            {tN("all", { count: rows.length })}
          </button>
          <button
            type="button"
            onClick={() => setUnreadOnly(true)}
            aria-pressed={unreadOnly}
            className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium ${
              unreadOnly ? "bg-surface text-primary-dark shadow-softer" : "text-text-secondary hover:text-primary-dark"
            }`}
          >
            {tN("unreadOnly", { count: unreadCount })}
          </button>
        </div>

        <button
          type="button"
          onClick={() => runAction("all", markAllRead, tN("markedAll"))}
          disabled={unreadCount === 0 || (pending && pendingId === "all")}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[13px] font-medium text-primary-dark transition-colors hover:bg-surface-alt disabled:opacity-50"
        >
          <CheckCheck size={14} />
          {tN("markAll")}
        </button>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          variant="inline"
          stateKey="notificationsNone"
          title={tEmpty("unreadTitle")}
          reason={tEmpty("unreadReason")}
          action={{ label: tEmpty("cta"), onClick: () => setUnreadOnly(false) }}
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((row) => (
            <NotificationItem
              key={row.id}
              row={row}
              mounted={mounted}
              pending={pending && (pendingId === row.id || pendingId === "all")}
              onMarkRead={handleMarkRead}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
