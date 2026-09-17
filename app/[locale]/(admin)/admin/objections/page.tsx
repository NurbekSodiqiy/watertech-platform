import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { listObjectionRows } from "@/lib/admin/queries";
import { DataTable } from "@/components/admin/DataTable";
import { deleteObjection, setObjectionStatus } from "@/lib/admin/actions/objections";
import type { AdminObjectionRow } from "@/lib/admin/queries";

export const metadata = { title: "Kontent boshqaruvi — E'tirozlar" };

export default async function AdminObjectionsListPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("emptyState.adminListNone");
  const type = t("types.objection");

  const rows = await listObjectionRows();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">E&apos;tirozlar</h1>
        <p className="mt-1 text-[13px] text-text-secondary">Mijoz e&apos;tirozlari va ularga javoblar.</p>
      </div>
      <DataTable<AdminObjectionRow>
        rows={rows}
        editBase="/admin/objections"
        emptyState={{ stateKey: "adminListNone", title: t("title", { type }), reason: t("reason"), ctaLabel: t("cta", { type }) }}
        columns={[{ key: "label", label: "Nomi", sortable: true }]}
        onDelete={deleteObjection}
        onToggleStatus={setObjectionStatus}
      />
    </div>
  );
}
