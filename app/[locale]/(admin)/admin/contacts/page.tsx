import type { Metadata } from "next";
import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { listContactRows, type AdminListRow } from "@/lib/admin/queries";
import { DataTable } from "@/components/admin/DataTable";
import { deleteContact, setContactStatus } from "@/lib/admin/actions/contacts";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params: { locale } }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.admin.contacts" });
  return { title: t("title") };
}

export default async function AdminContactsListPage({ params: { locale } }: { params: { locale: Locale } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("pages.admin.contacts");
  const tEmpty = await getTranslations("emptyState.adminListNone");
  const type = tEmpty("types.contact");

  const rows = await listContactRows();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">{t("title")}</h1>
        <p className="mt-1 text-[13px] text-text-secondary">{t("description")}</p>
      </div>
      <DataTable<AdminListRow<"content_contacts">>
        rows={rows}
        editBase="/admin/contacts"
        emptyState={{
          stateKey: "adminListNone",
          title: tEmpty("title", { type }),
          reason: tEmpty("reason"),
          ctaLabel: tEmpty("cta", { type }),
        }}
        columns={[
          { key: "name", label: t("columns.name"), sortable: true },
          { key: "role", label: t("columns.role"), sortable: true },
          { key: "topic", label: t("columns.topic") },
          { key: "phone", label: t("columns.phone") },
        ]}
        onDelete={deleteContact}
        onToggleStatus={setContactStatus}
      />
    </div>
  );
}
