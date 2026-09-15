import { unstable_setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { getServerSession } from "@/lib/auth/server-session";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { AdminShell } from "@/components/admin/AdminShell";

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

  return (
    <SessionProvider>
      <AdminShell>{children}</AdminShell>
    </SessionProvider>
  );
}
