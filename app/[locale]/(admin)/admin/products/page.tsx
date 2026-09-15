import { unstable_setRequestLocale } from "next-intl/server";
import { listProductRows } from "@/lib/admin/queries";
import { DataTable } from "@/components/admin/DataTable";
import { deleteProduct, setProductStatus } from "@/lib/admin/actions/products";
import type { ProductRow } from "@/lib/content/db";

export const metadata = { title: "Kontent boshqaruvi — Mahsulotlar" };

export default async function AdminProductsListPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);

  const rows = await listProductRows();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">Mahsulotlar</h1>
        <p className="mt-1 text-[13px] text-text-secondary">Mahsulot katalogi — rasm fayllari public/products/ ichida.</p>
      </div>
      <DataTable<ProductRow>
        rows={rows}
        editBase="/admin/products"
        emptyTitle="Hozircha mahsulotlar yo'q"
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
