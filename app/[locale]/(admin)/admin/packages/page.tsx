import type { Metadata } from "next";
import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Layers } from "lucide-react";
import { listPackageRows, listPackageGroupRows } from "@/lib/admin/queries";
import { DataTable } from "@/components/admin/DataTable";
import { deletePackage, setPackageStatus } from "@/lib/admin/actions/packages";
import type { AdminListRow } from "@/lib/admin/queries";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.admin.packages" });
  return { title: t("title") };
}

interface PackageDisplayRow extends AdminListRow<"content_packages"> {
  group_title: string;
}

export default async function AdminPackagesListPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("emptyState.adminListNone");
  const [tPage, tShared] = await Promise.all([
    getTranslations("pages.admin.packages"),
    getTranslations("pages.admin.shared"),
  ]);
  const type = t("types.package");

  const [packages, groups] = await Promise.all([listPackageRows(), listPackageGroupRows()]);
  const groupTitleById = new Map(groups.map((g) => [g.id, g.title]));
  const rows: PackageDisplayRow[] = packages.map((pkg) => ({
    ...pkg,
    group_title: groupTitleById.get(pkg.group_id) ?? pkg.group_id,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold text-primary-dark">{tPage("title")}</h1>
          <p className="mt-1 text-[13px] text-text-secondary">{tPage("description")}</p>
        </div>
        <Link
          href="/admin/packages/groups"
          className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-[13px] font-medium text-primary-dark transition-colors hover:bg-surface-alt"
        >
          <Layers size={14} />
          {tPage("manageGroups")}
        </Link>
      </div>
      <DataTable<PackageDisplayRow>
        rows={rows}
        editBase="/admin/packages"
        emptyState={{ stateKey: "adminListNone", title: t("title", { type }), reason: t("reason"), ctaLabel: t("cta", { type }) }}
        columns={[
          { key: "name", label: tShared("nameLabel"), sortable: true },
          { key: "group_title", label: tPage("columns.group"), sortable: true },
          { key: "estimated_discount", label: tPage("columns.discount"), sortable: true },
        ]}
        onDelete={deletePackage}
        onToggleStatus={setPackageStatus}
      />
    </div>
  );
}
