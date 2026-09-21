import type { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { ArrowLeft } from "lucide-react";
import { listVersions } from "@/lib/admin/queries";
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
  const versions = await listVersions(params.table, params.id);

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
      <VersionsList table={params.table} versions={versions} />
    </div>
  );
}
