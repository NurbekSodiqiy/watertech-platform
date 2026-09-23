"use client";

import type { DefaultValues } from "react-hook-form";
import { EntityForm, type EntityFieldDef } from "@/components/admin/EntityForm";
import { changelogFormSchema, type ChangelogFormInput } from "@/lib/admin/schemas";
import { upsertChangelog } from "@/lib/admin/actions/changelog";

/** Client boundary for the editor at /admin/changelog/[id]. The zod schema cannot be
 * passed from the Server Component page as a prop (React will not serialize a
 * class instance), so it is bound here together with its save action — see
 * ProductEditorForm for the full story. The page passes plain data only. */
export function ChangelogEditorForm({
  defaultValues,
  fields,
}: {
  defaultValues: DefaultValues<ChangelogFormInput>;
  fields: EntityFieldDef<ChangelogFormInput>[];
}) {
  return (
    <EntityForm
      schema={changelogFormSchema}
      defaultValues={defaultValues}
      fields={fields}
      onSubmit={upsertChangelog}
      backHref="/admin/changelog"
      titleField="title"
      table="content_changelog"
    />
  );
}
