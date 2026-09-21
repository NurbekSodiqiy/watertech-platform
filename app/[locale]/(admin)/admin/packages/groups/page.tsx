import type { Metadata } from "next";
import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { ArrowLeft } from "lucide-react";
import { listPackageGroupRows } from "@/lib/admin/queries";
import { DataTable } from "@/components/admin/DataTable";
import { deletePackageGroup, setPackageGroupStatus } from "@/lib/admin/actions/packages";
import type { AdminPackageGroupRow } from "@/lib/admin/queries";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.admin.packageGroups" });
  return { title: t("title") };
}

export default async function AdminPackageGroupsListPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("emptyState.adminListNone");
  const [tPage, tShared] = await Promise.all([
    getTranslations("pages.admin.packageGroups"),
    getTranslations("pages.admin.shared"),
  ]);
  const type = t("types.packageGroup");

  const rows = await listPackageGroupRows();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/packages"
          className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-primary-dark"
        >
          <ArrowLeft size={13} />
          {tPage("backToPackages")}
        </Link>
        <h1 className="mt-2 text-[24px] font-bold text-primary-dark">{tPage("title")}</h1>
        <p className="mt-1 text-[13px] text-text-secondary">{tPage("description")}</p>
      </div>
      <DataTable<AdminPackageGroupRow>
        rows={rows}
        editBase="/admin/packages/groups"
        emptyState={{ stateKey: "adminListNone", title: t("title", { type }), reason: t("reason"), ctaLabel: t("cta", { type }) }}
        columns={[
          { key: "title", label: tShared("nameLabel"), sortable: true },
          { key: "subtitle", label: tPage("columns.subtitle") },
        ]}
        onDelete={deletePackageGroup}
        onToggleStatus={setPackageGroupStatus}
      />
    </div>
  );
}
