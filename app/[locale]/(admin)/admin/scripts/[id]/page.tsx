import type { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/routing";
import { History } from "lucide-react";
import { getScriptRow, listFullRows } from "@/lib/admin/queries";
import { rowToObjection, rowToCompetitor, rowToFaq, rowToPackageGroup, rowToScript } from "@/lib/content/db";
import { ScriptEditor } from "@/components/admin/ScriptEditor";
import type { ContentBundle } from "@/lib/content/loader";
import type { Script } from "@/lib/content/types";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.admin.scripts" });
  return { title: t("editTitle") };
}

export default async function AdminScriptEditPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  const { locale } = params;
  unstable_setRequestLocale(locale);
  const [t, tShared] = await Promise.all([
    getTranslations("pages.admin.scripts"),
    getTranslations("pages.admin.shared"),
  ]);

  const isNew = params.id === "new";

  const [row, objectionRows, competitorRows, faqRows, packageGroupRows, packageRows] = await Promise.all([
    isNew ? Promise.resolve(null) : getScriptRow(params.id),
    // Whole rows, not the list projection: the link pickers and the live
    // preview map them through lib/content/db's rowTo* mappers.
    listFullRows("content_objections"),
    listFullRows("content_competitors"),
    listFullRows("content_faqs"),
    listFullRows("content_package_groups"),
    listFullRows("content_packages"),
  ]);
  if (!isNew && !row) notFound();

  const objections = objectionRows.map(rowToObjection);
  const competitors = competitorRows.map(rowToCompetitor);
  const faqs = faqRows.map(rowToFaq);
  const packageGroups = packageGroupRows.map((group) =>
    rowToPackageGroup(
      group,
      packageRows.filter((pkg) => pkg.group_id === group.id)
    )
  );

  const script: Script = row ? rowToScript(row) : { id: "", name: "", cheatSheet: "", stages: [] };

  // Uncached, RLS-scoped bundle (draft rows included) so the live preview
  // resolves link chips against what a manager is actually editing right
  // now, not the published-only cache lib/content/loader.ts serves operators.
  const previewBundle: ContentBundle = { scripts: [], objections, faqs, competitors, packageGroups };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">{isNew ? t("newTitle") : t("editTitle")}</h1>
        {!isNew && row && (
          <Link
            href={`/admin/versions/content_scripts/${row.id}`}
            className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline"
          >
            <History size={13} />
            {tShared("versions")}
          </Link>
        )}
      </div>
      <ScriptEditor
        isNew={isNew}
        script={script}
        status={row?.status ?? "draft"}
        version={row?.version}
        objections={objections}
        competitors={competitors}
        faqs={faqs}
        packageGroups={packageGroups}
        previewBundle={previewBundle}
      />
    </div>
  );
}
