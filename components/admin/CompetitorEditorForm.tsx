"use client";

import type { DefaultValues } from "react-hook-form";
import { EntityForm, type EntityFieldDef } from "@/components/admin/EntityForm";
import { competitorFormSchema, type CompetitorFormInput } from "@/lib/admin/schemas";
import { upsertCompetitor } from "@/lib/admin/actions/competitors";

/** Client boundary for the editor at /admin/competitors/[id]. The zod schema cannot be
 * passed from the Server Component page as a prop (React will not serialize a
 * class instance), so it is bound here together with its save action — see
 * ProductEditorForm for the full story. The page passes plain data only. */
export function CompetitorEditorForm({
  defaultValues,
  fields,
}: {
  defaultValues: DefaultValues<CompetitorFormInput>;
  fields: EntityFieldDef<CompetitorFormInput>[];
}) {
  return (
    <EntityForm
      schema={competitorFormSchema}
      defaultValues={defaultValues}
      fields={fields}
      onSubmit={upsertCompetitor}
      backHref="/admin/competitors"
      titleField="name"
      table="content_competitors"
    />
  );
}
