import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { listFaqRows } from "@/lib/admin/queries";
import { DataTable } from "@/components/admin/DataTable";
import { deleteFaq, setFaqStatus } from "@/lib/admin/actions/faq";
import type { AdminFaqRow } from "@/lib/admin/queries";

export const metadata = { title: "Kontent boshqaruvi — FAQ" };

export default async function AdminFaqListPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("emptyState.adminListNone");
  const type = t("types.faq");

  const rows = await listFaqRows();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">FAQ</h1>
        <p className="mt-1 text-[13px] text-text-secondary">Tez-tez so&apos;raladigan savollar ro&apos;yxati.</p>
      </div>
      <DataTable<AdminFaqRow>
        rows={rows}
        editBase="/admin/faq"
        emptyState={{ stateKey: "adminListNone", title: t("title", { type }), reason: t("reason"), ctaLabel: t("cta", { type }) }}
        columns={[
          { key: "question", label: "Savol", sortable: true },
          { key: "category", label: "Kategoriya", sortable: true },
        ]}
        onDelete={deleteFaq}
        onToggleStatus={setFaqStatus}
      />
    </div>
  );
}
