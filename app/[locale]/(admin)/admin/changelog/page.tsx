import type { Metadata } from "next";
import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { getChangelogReadCounts, listChangelogRows, type AdminListRow } from "@/lib/admin/queries";
import { DataTable } from "@/components/admin/DataTable";
import { deleteChangelog, setChangelogStatus } from "@/lib/admin/actions/changelog";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params: { locale } }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.admin.changelog" });
  return { title: t("title") };
}

/** The list row plus its "read by n / total" cell, already formatted — DataTable
 * renders every column as text from the row's own keys. */
type ChangelogListRow = AdminListRow<"content_changelog"> & { reads: string };

export default async function AdminChangelogListPage({ params: { locale } }: { params: { locale: Locale } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("pages.admin.changelog");
  const tEmpty = await getTranslations("emptyState.adminListNone");
  const type = tEmpty("types.changelog");

  const [entries, counts] = await Promise.all([listChangelogRows(), getChangelogReadCounts()]);
  const rows: ChangelogListRow[] = entries.map((entry) => ({
    ...entry,
    reads: counts ? t("readBy", { read: counts.readBy.get(entry.id) ?? 0, total: counts.total }) : "—",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">{t("title")}</h1>
        <p className="mt-1 text-[13px] text-text-secondary">{t("description")}</p>
      </div>
      <DataTable<ChangelogListRow>
        rows={rows}
        editBase="/admin/changelog"
        table="content_changelog"
        emptyState={{
          stateKey: "adminListNone",
          title: tEmpty("title", { type }),
          reason: tEmpty("reason"),
          ctaLabel: tEmpty("cta", { type }),
        }}
        columns={[
          { key: "title", label: t("columns.title"), sortable: true },
          { key: "published_on", label: t("columns.publishedOn"), sortable: true },
          { key: "approved_by", label: t("columns.approvedBy") },
          { key: "reads", label: t("columns.reads") },
        ]}
        onDelete={deleteChangelog}
        onToggleStatus={setChangelogStatus}
      />
    </div>
  );
}
