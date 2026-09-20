import { unstable_setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { ArrowLeft } from "lucide-react";
import { listVersions } from "@/lib/admin/queries";
import { VersionsList } from "@/components/admin/VersionsList";

const TABLE_INFO: Record<string, { label: string; backHref: string }> = {
  content_faqs: { label: "FAQ", backHref: "/admin/faq" },
  content_objections: { label: "E'tiroz", backHref: "/admin/objections" },
  content_competitors: { label: "Raqobatchi", backHref: "/admin/competitors" },
  content_packages: { label: "Paket", backHref: "/admin/packages" },
  content_package_groups: { label: "Paket guruhi", backHref: "/admin/packages/groups" },
  content_products: { label: "Mahsulot", backHref: "/admin/products" },
  content_scripts: { label: "Skript", backHref: "/admin/scripts" },
  content_changelog: { label: "O'zgarish", backHref: "/admin/changelog" },
};

export const metadata = { title: "Kontent boshqaruvi — Versiyalar" };

export default async function AdminVersionsPage({
  params,
}: {
  params: { locale: string; table: string; id: string };
}) {
  const { locale } = params;
  unstable_setRequestLocale(locale);

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
          Ortga
        </Link>
        <h1 className="mt-2 text-[24px] font-bold text-primary-dark">
          Versiyalar tarixi — {info?.label ?? params.table} ({params.id})
        </h1>
      </div>
      <VersionsList table={params.table} versions={versions} />
    </div>
  );
}
