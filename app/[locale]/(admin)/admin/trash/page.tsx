import type { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { listTrash } from "@/lib/admin/queries";
import { EmptyState } from "@/components/EmptyState";
import { TrashTable } from "@/components/admin/TrashTable";

/** Delete snapshots read per page. The list is filtered after the read (rows
 * that exist again drop out), so a page can render fewer than this. */
const PAGE_SIZE = 25;

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.admin.trash" });
  return { title: t("title") };
}

function pageNumber(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 1 ? parsed : 1;
}

export default async function AdminTrashPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { page?: string | string[] };
}) {
  unstable_setRequestLocale(locale);
  const [t, tEmpty] = await Promise.all([
    getTranslations("pages.admin.trash"),
    getTranslations("emptyState.trashNone"),
  ]);

  const page = pageNumber(searchParams.page);
  const { entries, hasMore } = await listTrash({ offset: (page - 1) * PAGE_SIZE, pageSize: PAGE_SIZE });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">{t("title")}</h1>
        <p className="mt-1 text-[13px] text-text-secondary">{t("description")}</p>
      </div>

      {entries.length === 0 ? (
        <EmptyState variant="compact" stateKey="trashNone" title={tEmpty("title")} reason={tEmpty("reason")} />
      ) : (
        <TrashTable entries={entries} />
      )}

      {(page > 1 || hasMore) && (
        <div className="flex items-center justify-between gap-3">
          {page > 1 ? (
            <Link
              href={`/admin/trash?page=${page - 1}`}
              className="rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-primary-dark transition-colors hover:bg-surface-alt"
            >
              {t("newer")}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-[12.5px] text-text-secondary">{t("page", { page })}</span>
          {hasMore ? (
            <Link
              href={`/admin/trash?page=${page + 1}`}
              className="rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-primary-dark transition-colors hover:bg-surface-alt"
            >
              {t("older")}
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
