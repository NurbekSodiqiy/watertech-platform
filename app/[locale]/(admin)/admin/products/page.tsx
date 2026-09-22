import type { Metadata } from "next";
import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { listProductRows, type AdminListRow } from "@/lib/admin/queries";
import { DataTable } from "@/components/admin/DataTable";
import { deleteProduct, setProductStatus } from "@/lib/admin/actions/products";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.admin.products" });
  return { title: t("title") };
}

export default async function AdminProductsListPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("emptyState.adminListNone");
  const [tPage, tShared] = await Promise.all([
    getTranslations("pages.admin.products"),
    getTranslations("pages.admin.shared"),
  ]);
  const type = t("types.product");

  const rows = await listProductRows();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">{tPage("title")}</h1>
        <p className="mt-1 text-[13px] text-text-secondary">{tPage("description")}</p>
      </div>
      <DataTable<AdminListRow<"content_products">>
        rows={rows}
        editBase="/admin/products"
        emptyState={{ stateKey: "adminListNone", title: t("title", { type }), reason: t("reason"), ctaLabel: t("cta", { type }) }}
        columns={[
          { key: "name_ru", label: tShared("nameLabel"), sortable: true },
          { key: "line", label: tPage("columns.line"), sortable: true },
          { key: "category", label: tPage("columns.category"), sortable: true },
        ]}
        onDelete={deleteProduct}
        onToggleStatus={setProductStatus}
      />
    </div>
  );
}
