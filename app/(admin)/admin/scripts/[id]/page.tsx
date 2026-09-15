import { notFound } from "next/navigation";
import Link from "next/link";
import { History } from "lucide-react";
import {
  getScriptRow,
  listObjectionRows,
  listCompetitorRows,
  listFaqRows,
  listPackageGroupRows,
  listPackageRows,
} from "@/lib/admin/queries";
import { rowToObjection, rowToCompetitor, rowToFaq, rowToPackageGroup, rowToScript } from "@/lib/content/db";
import { ScriptEditor } from "@/components/admin/ScriptEditor";
import type { ContentBundle } from "@/lib/content/loader";
import type { Script } from "@/lib/content/types";

export const metadata = { title: "Kontent boshqaruvi — Skript tahrirlash" };

export default async function AdminScriptEditPage({ params }: { params: { id: string } }) {
  const isNew = params.id === "new";

  const [row, objectionRows, competitorRows, faqRows, packageGroupRows, packageRows] = await Promise.all([
    isNew ? Promise.resolve(null) : getScriptRow(params.id),
    listObjectionRows(),
    listCompetitorRows(),
    listFaqRows(),
    listPackageGroupRows(),
    listPackageRows(),
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
        <h1 className="text-[24px] font-bold text-primary-dark">{isNew ? "Yangi skript" : "Skriptni tahrirlash"}</h1>
        {!isNew && row && (
          <Link
            href={`/admin/versions/content_scripts/${row.id}`}
            className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline"
          >
            <History size={13} />
            Versiyalar tarixi
          </Link>
        )}
      </div>
      <ScriptEditor
        isNew={isNew}
        script={script}
        status={row?.status ?? "draft"}
        objections={objections}
        competitors={competitors}
        faqs={faqs}
        packageGroups={packageGroups}
        previewBundle={previewBundle}
      />
    </div>
  );
}
