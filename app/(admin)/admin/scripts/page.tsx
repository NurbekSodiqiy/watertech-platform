import { ComingSoon } from "@/components/ComingSoon";
import { listScriptRows } from "@/lib/admin/queries";

export const metadata = { title: "Kontent boshqaruvi — Skriptlar" };

// Scripts carry a nested Stage[]/turn structure (see lib/content/types.ts)
// that a flat EntityForm can't edit safely — full script CRUD is a
// follow-up task. This page lists the current count only, so a manager can
// see the section exists without an editor that would corrupt the data.
export default async function AdminScriptsPage() {
  const scripts = await listScriptRows();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">Skriptlar</h1>
        <p className="mt-1 text-[13px] text-text-secondary">
          Hozircha {scripts.length} ta skript mavjud. Tahrirlash keyingi bosqichda qo&apos;shiladi.
        </p>
      </div>
      <ComingSoon
        title="Skriptlarni tahrirlash tez orada"
        description="Skript bosqichlari va repliklari uchun alohida tahrirlovchi keyingi bosqichda qo'shiladi."
      />
    </div>
  );
}
