"use client";

import type { DefaultValues } from "react-hook-form";
import { EntityForm, type EntityFieldDef } from "@/components/admin/EntityForm";
import { packageGroupFormSchema, type PackageGroupFormInput } from "@/lib/admin/schemas";
import { upsertPackageGroup } from "@/lib/admin/actions/packages";

/** Client boundary for the editor at /admin/packages/groups/[id]. The zod schema cannot be
 * passed from the Server Component page as a prop (React will not serialize a
 * class instance), so it is bound here together with its save action — see
 * ProductEditorForm for the full story. The page passes plain data only. */
export function PackageGroupEditorForm({
  defaultValues,
  fields,
}: {
  defaultValues: DefaultValues<PackageGroupFormInput>;
  fields: EntityFieldDef<PackageGroupFormInput>[];
}) {
  return (
    <EntityForm
      schema={packageGroupFormSchema}
      defaultValues={defaultValues}
      fields={fields}
      onSubmit={upsertPackageGroup}
      backHref="/admin/packages/groups"
      titleField="title"
      table="content_package_groups"
    />
  );
}
