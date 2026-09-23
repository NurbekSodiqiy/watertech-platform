"use client";

import type { DefaultValues } from "react-hook-form";
import { EntityForm, type EntityFieldDef } from "@/components/admin/EntityForm";
import { objectionFormSchema, type ObjectionFormInput } from "@/lib/admin/schemas";
import { upsertObjection } from "@/lib/admin/actions/objections";

/** Client boundary for the editor at /admin/objections/[id]. The zod schema cannot be
 * passed from the Server Component page as a prop (React will not serialize a
 * class instance), so it is bound here together with its save action — see
 * ProductEditorForm for the full story. The page passes plain data only. */
export function ObjectionEditorForm({
  defaultValues,
  fields,
}: {
  defaultValues: DefaultValues<ObjectionFormInput>;
  fields: EntityFieldDef<ObjectionFormInput>[];
}) {
  return (
    <EntityForm
      schema={objectionFormSchema}
      defaultValues={defaultValues}
      fields={fields}
      onSubmit={upsertObjection}
      backHref="/admin/objections"
    />
  );
}
