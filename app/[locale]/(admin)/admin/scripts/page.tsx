import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { listScriptRows } from "@/lib/admin/queries";
import { DataTable } from "@/components/admin/DataTable";
import { deleteScript, setScriptStatus } from "@/lib/admin/actions/scripts";
import type { AdminScriptRow } from "@/lib/admin/queries";

export const metadata = { title: "Kontent boshqaruvi — Skriptlar" };

export default async function AdminScriptsListPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("emptyState.adminListNone");
  const type = t("types.script");

  const rows = await listScriptRows();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">Skriptlar</h1>
        <p className="mt-1 text-[13px] text-text-secondary">Savdo skriptlari, ularning bosqichlari va repliklari.</p>
      </div>
      <DataTable<AdminScriptRow>
        rows={rows}
        editBase="/admin/scripts"
        emptyState={{ stateKey: "adminListNone", title: t("title", { type }), reason: t("reason"), ctaLabel: t("cta", { type }) }}
        columns={[{ key: "name", label: "Nomi", sortable: true }]}
        onDelete={deleteScript}
        onToggleStatus={setScriptStatus}
      />
    </div>
  );
}
