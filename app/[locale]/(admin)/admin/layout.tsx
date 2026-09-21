import { NextIntlClientProvider } from "next-intl";
import { getMessages, unstable_setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { getServerSession } from "@/lib/auth/server-session";
import { ADMIN_CLIENT_NAMESPACES, ROOT_CLIENT_NAMESPACES, pickMessages } from "@/lib/i18n/client-messages";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { AdminShell } from "@/components/admin/AdminShell";
import { NotificationsBell } from "@/components/admin/NotificationsBell";

export default async function AdminLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  const session = await getServerSession();
  if (!session || session.role !== "manager") redirect({ href: "/", locale });

  // A nested provider replaces the parent's messages instead of merging, so it repeats the root list.
  const messages = pickMessages(await getMessages(), [...ROOT_CLIENT_NAMESPACES, ...ADMIN_CLIENT_NAMESPACES]);

  return (
    <NextIntlClientProvider messages={messages}>
      <SessionProvider>
        <AdminShell notificationsSlot={<NotificationsBell />}>{children}</AdminShell>
      </SessionProvider>
    </NextIntlClientProvider>
  );
}
