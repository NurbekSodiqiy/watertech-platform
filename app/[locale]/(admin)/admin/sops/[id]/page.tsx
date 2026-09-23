import type { Metadata } from "next";
import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { History } from "lucide-react";
import { getSopRow } from "@/lib/admin/queries";
import { rowToSop } from "@/lib/content/db";
import { SopEditor } from "@/components/admin/SopEditor";
import type { Locale } from "@/i18n/routing";
import type { Sop } from "@/lib/content/types";

export async function generateMetadata({ params: { locale } }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.admin.sops" });
  return { title: t("editTitle") };
}

export default async function AdminSopEditPage({
  params,
  searchParams,
}: {
  params: { locale: Locale; id: string };
  searchParams: { from?: string };
}) {
  const { locale } = params;
  unstable_setRequestLocale(locale);
  const t = await getTranslations("pages.admin.sops");

  const isNew = params.id === "new";
  const row = isNew ? null : await getSopRow(params.id);
  if (!isNew && !row) notFound();
  // /admin/sops/new?from=<id> — the DataTable duplicate action; prefills from
  // that row's own full data, never the list projection.
  const sourceRow = isNew && searchParams.from ? await getSopRow(searchParams.from) : null;

  // A brand-new SOP (no source to duplicate) starts with one empty step so
  // the form is not just a blank list.
  const sop: Sop = row
    ? rowToSop(row)
    : sourceRow
      ? { ...rowToSop(sourceRow), id: `${sourceRow.id}-nusxa` }
      : { id: "", title: "", summary: "", steps: [{ title: "", body: "" }] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">{isNew ? t("newTitle") : t("editTitle")}</h1>
        {!isNew && row && (
          <Link
            href={`/admin/versions/content_sops/${row.id}`}
            className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline"
          >
            <History size={13} />
            {t("versions")}
          </Link>
        )}
      </div>
      <SopEditor isNew={isNew} sop={sop} status={row ? row.status : "draft"} version={row?.version} />
    </div>
  );
}
