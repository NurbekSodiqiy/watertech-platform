import { unstable_setRequestLocale } from "next-intl/server";
import { listScriptRows } from "@/lib/admin/queries";
import { DataTable } from "@/components/admin/DataTable";
import { deleteScript, setScriptStatus } from "@/lib/admin/actions/scripts";
import type { ScriptRow } from "@/lib/content/db";

export const metadata = { title: "Kontent boshqaruvi — Skriptlar" };

export default async function AdminScriptsListPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);

  const rows = await listScriptRows();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">Skriptlar</h1>
        <p className="mt-1 text-[13px] text-text-secondary">Savdo skriptlari, ularning bosqichlari va repliklari.</p>
      </div>
      <DataTable<ScriptRow>
        rows={rows}
        editBase="/admin/scripts"
        emptyTitle="Hozircha skriptlar yo'q"
        columns={[{ key: "name", label: "Nomi", sortable: true }]}
        onDelete={deleteScript}
        onToggleStatus={setScriptStatus}
      />
    </div>
  );
}
