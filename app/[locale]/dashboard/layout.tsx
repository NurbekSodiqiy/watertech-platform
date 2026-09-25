import { NextIntlClientProvider } from "next-intl";
import { getMessages, unstable_setRequestLocale } from "next-intl/server";
import { requireAdminPage } from "@/lib/auth/server-session";
import { AdminShell } from "@/components/admin/AdminShell";
import { NotificationsBell } from "@/components/admin/NotificationsBell";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { DASHBOARD_CLIENT_NAMESPACES, ROOT_CLIENT_NAMESPACES, pickMessages } from "@/lib/i18n/client-messages";

// The monitoring pages are part of the admin panel (CLAUDE.md §15): the same
// AdminShell and provider setup as app/[locale]/(admin)/admin/layout.tsx, and
// each page renders its own PageHeader. The admin gate (requireAdminPage,
// lib/auth/server-session.ts) runs here AND first in every page under
// app/[locale]/dashboard. The layout call is what keeps the shell itself from
// rendering for a non-admin: with dashboard/loading.tsx the layout streams
// before the page runs, so a page-only redirect would arrive after a 200 with
// the admin chrome already sent (R3 release audit). The page calls stay —
// a layout is not re-run on client navigation between its pages.
export default async function DashboardLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  await requireAdminPage(locale);
  // A nested provider replaces the parent's messages instead of merging, so it repeats the root list.
  const messages = pickMessages(await getMessages(), [...ROOT_CLIENT_NAMESPACES, ...DASHBOARD_CLIENT_NAMESPACES]);
  return (
    <NextIntlClientProvider messages={messages}>
      <SessionProvider>
        <AdminShell notificationsSlot={<NotificationsBell />}>
          <div className="mx-auto max-w-6xl space-y-6">{children}</div>
        </AdminShell>
      </SessionProvider>
    </NextIntlClientProvider>
  );
}
