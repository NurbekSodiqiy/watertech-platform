import type { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { ArrowLeft } from "lucide-react";
import { getRow, listVersions } from "@/lib/admin/queries";
import { isContentTable } from "@/lib/admin/registry";
import { isSnapshotRow, type SnapshotRow } from "@/lib/admin/snapshot";
import { VersionsList } from "@/components/admin/VersionsList";

// The table's display name is the `admin.versions.tables.<table>` message.
const TABLE_INFO: Record<string, { backHref: string }> = {
  content_faqs: { backHref: "/admin/faq" },
  content_objections: { backHref: "/admin/objections" },
  content_competitors: { backHref: "/admin/competitors" },
  content_packages: { backHref: "/admin/packages" },
  content_package_groups: { backHref: "/admin/packages/groups" },
  content_products: { backHref: "/admin/products" },
  content_scripts: { backHref: "/admin/scripts" },
  content_changelog: { backHref: "/admin/changelog" },
  content_contacts: { backHref: "/admin/contacts" },
  content_sops: { backHref: "/admin/sops" },
};

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "admin.versions" });
  return { title: t("metadata") };
}

export default async function AdminVersionsPage({
  params,
}: {
  params: { locale: string; table: string; id: string };
}) {
  const { locale } = params;
  unstable_setRequestLocale(locale);

  const t = await getTranslations("admin.versions");
  const info = TABLE_INFO[params.table];
  // The live row is the right-hand side of every diff and carries the version
  // a restore is guarded on. Null when the row is deleted — its delete
  // snapshot then restores it as a draft, same as /admin/trash.
  const [versions, live] = await Promise.all([
    listVersions(params.table, params.id),
    isContentTable(params.table) ? getRow(params.table, params.id) : Promise.resolve(null),
  ]);
  const currentRow: SnapshotRow | null = isSnapshotRow(live) ? live : null;
  const currentVersion = typeof currentRow?.version === "number" ? currentRow.version : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={info?.backHref ?? "/admin"}
          className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-primary-dark"
        >
          <ArrowLeft size={13} />
          {t("back")}
        </Link>
        <h1 className="mt-2 text-[24px] font-bold text-primary-dark">
          {t("historyTitle", { table: info ? t(`tables.${params.table}`) : params.table, id: params.id })}
        </h1>
      </div>
      <VersionsList
        table={params.table}
        versions={versions}
        currentRow={currentRow}
        currentVersion={currentVersion}
      />
    </div>
  );
}
