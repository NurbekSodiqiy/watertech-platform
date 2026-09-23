import type { Metadata } from "next";
import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { listFaqRows } from "@/lib/admin/queries";
import { DataTable } from "@/components/admin/DataTable";
import { deleteFaq, setFaqStatus } from "@/lib/admin/actions/faq";
import type { AdminListRow } from "@/lib/admin/queries";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.admin.faq" });
  return { title: t("title") };
}

export default async function AdminFaqListPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("emptyState.adminListNone");
  const tPage = await getTranslations("pages.admin.faq");
  const type = t("types.faq");

  const rows = await listFaqRows();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">{tPage("title")}</h1>
        <p className="mt-1 text-[13px] text-text-secondary">{tPage("description")}</p>
      </div>
      <DataTable<AdminListRow<"content_faqs">>
        rows={rows}
        editBase="/admin/faq"
        table="content_faqs"
        emptyState={{ stateKey: "adminListNone", title: t("title", { type }), reason: t("reason"), ctaLabel: t("cta", { type }) }}
        columns={[
          { key: "question", label: tPage("columns.question"), sortable: true },
          { key: "category", label: tPage("columns.category"), sortable: true },
        ]}
        onDelete={deleteFaq}
        onToggleStatus={setFaqStatus}
      />
    </div>
  );
}
