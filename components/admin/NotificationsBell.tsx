import { Bell } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { countUnread, NotificationsQueryError } from "@/lib/notifications/queries";

/** Server Component: the unread count is read at render time and refreshed by
 * revalidateNotificationViews() after anything that changes it. Rendered by
 * the admin and dashboard layouts and handed to their (client) headers as a
 * slot. A failed count query (e.g. 0007 not applied yet) degrades to a plain
 * bell instead of taking the whole manager layout down; any other error —
 * including Next.js's own dynamic-rendering bailout — is rethrown. */
export async function NotificationsBell() {
  const t = await getTranslations("admin.notifications");
  let unread = 0;
  try {
    unread = await countUnread();
  } catch (error) {
    if (!(error instanceof NotificationsQueryError)) throw error;
    console.error("[notifications] unread count failed:", error.message);
  }

  const label = unread > 0 ? t("bellUnread", { count: unread }) : t("bell");

  return (
    <Link
      href="/admin/notifications"
      aria-label={label}
      title={label}
      className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-surface-alt hover:text-primary-dark"
    >
      <Bell size={15} />
      {unread > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-outdated px-1 text-[11px] font-semibold leading-none text-surface">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
