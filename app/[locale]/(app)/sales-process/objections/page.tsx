import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DatabaseTemplate, DbColumn } from "@/components/DatabaseTemplate";
import { getObjections, getScripts } from "@/lib/content/loader";
import type { Locale } from "@/i18n/routing";

interface ObjectionRow {
  id: string;
  objection: string;
  realMeaning: string;
  response: string;
  followUp: string;
  sourceScripts: string;
}

export default async function ObjectionsPage({ params: { locale } }: { params: { locale: Locale } }) {
  unstable_setRequestLocale(locale);
  const [t, tNav, tPage] = await Promise.all([
    getTranslations("emptyState.objectionsNone"),
    getTranslations("nav"),
    getTranslations("pages.salesProcess.objections"),
  ]);

  const columns: DbColumn<ObjectionRow>[] = [
    { key: "objection", label: tPage("columns.objection"), sortable: true, type: "longtext" },
    { key: "realMeaning", label: tPage("columns.realMeaning"), type: "longtext" },
    { key: "response", label: tPage("columns.response"), type: "longtext" },
    { key: "followUp", label: tPage("columns.followUp"), type: "longtext" },
    { key: "sourceScripts", label: tPage("columns.sourceScripts") },
  ];

  const [objections, scripts] = await Promise.all([getObjections(locale), getScripts(locale)]);
  const scriptNameById = new Map(scripts.map((s) => [s.id, s.name]));
  const rows: ObjectionRow[] = objections.map((o) => ({
    id: o.id,
    objection: `"${o.clientSays}"`,
    realMeaning: o.realMeaning,
    response: o.response,
    followUp: o.followUp ?? "—",
    sourceScripts: o.scriptIds.map((id) => scriptNameById.get(id) ?? id).join(", "),
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <PageHeader
        path="/sales-process/objections"
        title={tNav("salesProcess.objections.title")}
        description={tPage("description")}
      />

      <div className="flex items-start gap-3 rounded-2xl border border-status-warning/40 bg-status-warning/10 p-4">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-status-warning" />
        <p className="text-[13.5px] text-primary-dark">
          {tPage.rich("important", { strong: (chunks) => <strong>{chunks}</strong> })}
        </p>
      </div>

      <DatabaseTemplate
        columns={columns}
        rows={rows}
        emptyState={{
          stateKey: "objectionsNone",
          title: t("title"),
          reason: t("reason"),
          cta: { kind: "open-search", label: t("cta") },
        }}
      />
    </div>
  );
}
