import { unstable_setRequestLocale } from "next-intl/server";
import { listCompetitorRows } from "@/lib/admin/queries";
import { DataTable } from "@/components/admin/DataTable";
import { deleteCompetitor, setCompetitorStatus } from "@/lib/admin/actions/competitors";
import type { AdminCompetitorRow } from "@/lib/admin/queries";

export const metadata = { title: "Kontent boshqaruvi — Raqobatchilar" };

export default async function AdminCompetitorsListPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);

  const rows = await listCompetitorRows();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">Raqobatchilar</h1>
        <p className="mt-1 text-[13px] text-text-secondary">Raqobatchi kompaniyalar bo&apos;yicha taqqoslash kartalari.</p>
      </div>
      <DataTable<AdminCompetitorRow>
        rows={rows}
        editBase="/admin/competitors"
        emptyTitle="Hozircha raqobatchilar yo'q"
        columns={[
          { key: "name", label: "Nomi", sortable: true },
          { key: "threat_level", label: "Tahdid darajasi", sortable: true },
        ]}
        onDelete={deleteCompetitor}
        onToggleStatus={setCompetitorStatus}
      />
    </div>
  );
}
