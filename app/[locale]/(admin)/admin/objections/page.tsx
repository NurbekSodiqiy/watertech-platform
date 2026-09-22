import type { Metadata } from "next";
import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { listObjectionRows, type AdminListRow } from "@/lib/admin/queries";
import { DataTable } from "@/components/admin/DataTable";
import { deleteObjection, setObjectionStatus } from "@/lib/admin/actions/objections";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.admin.objections" });
  return { title: t("title") };
}

export default async function AdminObjectionsListPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("emptyState.adminListNone");
  const [tPage, tShared] = await Promise.all([
    getTranslations("pages.admin.objections"),
    getTranslations("pages.admin.shared"),
  ]);
  const type = t("types.objection");

  const rows = await listObjectionRows();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">{tPage("title")}</h1>
        <p className="mt-1 text-[13px] text-text-secondary">{tPage("description")}</p>
      </div>
      <DataTable<AdminListRow<"content_objections">>
        rows={rows}
        editBase="/admin/objections"
        emptyState={{ stateKey: "adminListNone", title: t("title", { type }), reason: t("reason"), ctaLabel: t("cta", { type }) }}
        columns={[{ key: "label", label: tShared("nameLabel"), sortable: true }]}
        onDelete={deleteObjection}
        onToggleStatus={setObjectionStatus}
      />
    </div>
  );
}
