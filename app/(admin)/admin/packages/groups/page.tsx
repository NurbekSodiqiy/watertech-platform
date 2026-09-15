import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listPackageGroupRows } from "@/lib/admin/queries";
import { DataTable } from "@/components/admin/DataTable";
import { deletePackageGroup, setPackageGroupStatus } from "@/lib/admin/actions/packages";
import type { PackageGroupRow } from "@/lib/content/db";

export const metadata = { title: "Kontent boshqaruvi — Paket guruhlari" };

export default async function AdminPackageGroupsListPage() {
  const rows = await listPackageGroupRows();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/packages"
          className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-primary-dark"
        >
          <ArrowLeft size={13} />
          Paketlarga qaytish
        </Link>
        <h1 className="mt-2 text-[24px] font-bold text-primary-dark">Paket guruhlari</h1>
        <p className="mt-1 text-[13px] text-text-secondary">Har bir paket shu guruhlardan biriga tegishli bo&apos;ladi.</p>
      </div>
      <DataTable<PackageGroupRow>
        rows={rows}
        editBase="/admin/packages/groups"
        emptyTitle="Hozircha guruhlar yo'q"
        columns={[
          { key: "title", label: "Nomi", sortable: true },
          { key: "subtitle", label: "Tavsif" },
        ]}
        onDelete={deletePackageGroup}
        onToggleStatus={setPackageGroupStatus}
      />
    </div>
  );
}
