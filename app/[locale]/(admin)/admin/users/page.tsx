import type { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { getServerSession } from "@/lib/auth/server-session";
import { listAdminUsers } from "@/lib/admin/queries";
import { UsersTable } from "@/components/admin/UsersTable";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.admin.users" });
  return { title: t("title") };
}

/** Who may sign in, and as what. The admin layout has already refused
 * anyone who is not a manager; the session is read again here only for the
 * caller's own email, which marks their row read-only in the table. */
export default async function AdminUsersPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const [t, session, list] = await Promise.all([
    getTranslations("pages.admin.users"),
    getServerSession(),
    listAdminUsers(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">{t("title")}</h1>
        <p className="mt-1 text-[13px] text-text-secondary">{t("description")}</p>
      </div>

      {!list.activityAvailable && (
        <p className="rounded-xl border border-status-warning/40 bg-status-warning/10 px-4 py-2.5 text-[13px] text-primary-dark">
          {t("activityUnavailable")}
        </p>
      )}

      <UsersTable users={list.users} currentEmail={session?.email.toLowerCase() ?? ""} />
    </div>
  );
}
