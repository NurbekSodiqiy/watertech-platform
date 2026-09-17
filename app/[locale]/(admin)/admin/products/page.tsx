import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { listProductRows } from "@/lib/admin/queries";
import { DataTable } from "@/components/admin/DataTable";
import { deleteProduct, setProductStatus } from "@/lib/admin/actions/products";
import type { AdminProductRow } from "@/lib/admin/queries";

export const metadata = { title: "Kontent boshqaruvi — Mahsulotlar" };

export default async function AdminProductsListPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("emptyState.adminListNone");
  const type = t("types.product");

  const rows = await listProductRows();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">Mahsulotlar</h1>
        <p className="mt-1 text-[13px] text-text-secondary">Mahsulot katalogi — rasm fayllari public/products/ ichida.</p>
      </div>
      <DataTable<AdminProductRow>
        rows={rows}
        editBase="/admin/products"
        emptyState={{ stateKey: "adminListNone", title: t("title", { type }), reason: t("reason"), ctaLabel: t("cta", { type }) }}
        columns={[
          { key: "name_ru", label: "Nomi", sortable: true },
          { key: "line", label: "Yo'nalish", sortable: true },
          { key: "category", label: "Kategoriya", sortable: true },
        ]}
        onDelete={deleteProduct}
        onToggleStatus={setProductStatus}
      />
    </div>
  );
}
