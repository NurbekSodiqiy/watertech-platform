import type { Metadata } from "next";
import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { listSopRows, type AdminListRow } from "@/lib/admin/queries";
import { DataTable } from "@/components/admin/DataTable";
import { deleteSop, setSopStatus } from "@/lib/admin/actions/sops";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params: { locale } }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.admin.sops" });
  return { title: t("title") };
}

/** The list row plus its step count, already formatted — DataTable renders
 * every column as text from the row's own keys. */
type SopListRow = AdminListRow<"content_sops"> & { stepCount: string };

export default async function AdminSopsListPage({ params: { locale } }: { params: { locale: Locale } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("pages.admin.sops");
  const tEmpty = await getTranslations("emptyState.adminListNone");
  const type = tEmpty("types.sop");

  // Counting the JSONB array is all this column needs, so the steps are not
  // re-parsed through rowToSop here — a malformed column reads as 0, never
  // throws, same contract as the content mappers.
  const rows: SopListRow[] = (await listSopRows()).map((row) => ({
    ...row,
    stepCount: String(Array.isArray(row.steps) ? row.steps.length : 0),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">{t("title")}</h1>
        <p className="mt-1 text-[13px] text-text-secondary">{t("description")}</p>
      </div>
      <DataTable<SopListRow>
        rows={rows}
        editBase="/admin/sops"
        emptyState={{
          stateKey: "adminListNone",
          title: tEmpty("title", { type }),
          reason: tEmpty("reason"),
          ctaLabel: tEmpty("cta", { type }),
        }}
        columns={[
          { key: "title", label: t("columns.title"), sortable: true },
          { key: "summary", label: t("columns.summary") },
          { key: "stepCount", label: t("columns.stepCount") },
        ]}
        onDelete={deleteSop}
        onToggleStatus={setSopStatus}
      />
    </div>
  );
}
