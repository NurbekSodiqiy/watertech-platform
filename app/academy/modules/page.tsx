import { PageHeader } from "@/components/DocPageTemplate";
import { DatabaseTemplate, DbColumn } from "@/components/DatabaseTemplate";
import { getMockMeta } from "@/lib/site-config";
import { modules } from "@/lib/mock-data/modules";

const columns: DbColumn[] = [
  { key: "topic", label: "Topic", sortable: true },
  { key: "format", label: "Format" },
  { key: "duration", label: "Duration" },
  { key: "test", label: "Test" },
  { key: "level", label: "Level" },
];

export default function ModulesPage() {
  const meta = getMockMeta("/academy/modules");
  const levels = Array.from(new Set(modules.map((m) => m.level)));

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <PageHeader
        path="/academy/modules"
        title="Training Modules"
        description="Onboarding and skill-building content, organized by level."
        meta={meta}
      />
      <DatabaseTemplate
        columns={columns}
        rows={modules}
        filters={[{ key: "level", label: "Level", options: levels }]}
      />
    </div>
  );
}
