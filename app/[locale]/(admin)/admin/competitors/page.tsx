import type { Metadata } from "next";
import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { listCompetitorRows } from "@/lib/admin/queries";
import { DataTable } from "@/components/admin/DataTable";
import { deleteCompetitor, setCompetitorStatus } from "@/lib/admin/actions/competitors";
import type { AdminCompetitorRow } from "@/lib/admin/queries";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.admin.competitors" });
  return { title: t("title") };
}

export default async function AdminCompetitorsListPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("emptyState.adminListNone");
  const [tPage, tShared] = await Promise.all([
    getTranslations("pages.admin.competitors"),
    getTranslations("pages.admin.shared"),
  ]);
  const type = t("types.competitor");

  const rows = await listCompetitorRows();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">{tPage("title")}</h1>
        <p className="mt-1 text-[13px] text-text-secondary">{tPage("description")}</p>
      </div>
      <DataTable<AdminCompetitorRow>
        rows={rows}
        editBase="/admin/competitors"
        emptyState={{ stateKey: "adminListNone", title: t("title", { type }), reason: t("reason"), ctaLabel: t("cta", { type }) }}
        columns={[
          { key: "name", label: tShared("nameLabel"), sortable: true },
          { key: "threat_level", label: tPage("columns.threatLevel"), sortable: true },
        ]}
        onDelete={deleteCompetitor}
        onToggleStatus={setCompetitorStatus}
      />
    </div>
  );
}
