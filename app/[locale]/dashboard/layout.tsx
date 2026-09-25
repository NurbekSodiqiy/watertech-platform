import { NextIntlClientProvider } from "next-intl";
import { getMessages, unstable_setRequestLocale } from "next-intl/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { NotificationsBell } from "@/components/admin/NotificationsBell";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { DASHBOARD_CLIENT_NAMESPACES, ROOT_CLIENT_NAMESPACES, pickMessages } from "@/lib/i18n/client-messages";

// The monitoring pages are part of the admin panel (CLAUDE.md §15): the same
// AdminShell and provider setup as app/[locale]/(admin)/admin/layout.tsx, and
// each page renders its own PageHeader. The admin gate (requireAdminPage,
// lib/auth/server-session.ts) deliberately stays at page level — every page
// under app/[locale]/dashboard calls it first, the page-side counterpart of
// middleware's isAdminArea() — instead of a layout-level redirect.
export default async function DashboardLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
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
