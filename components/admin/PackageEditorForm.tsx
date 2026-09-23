"use client";

import type { DefaultValues } from "react-hook-form";
import { EntityForm, type EntityFieldDef } from "@/components/admin/EntityForm";
import { packageFormSchema, type PackageFormInput } from "@/lib/admin/schemas";
import { upsertPackage } from "@/lib/admin/actions/packages";

/** Client boundary for the editor at /admin/packages/[id]. The zod schema cannot be
 * passed from the Server Component page as a prop (React will not serialize a
 * class instance), so it is bound here together with its save action — see
 * ProductEditorForm for the full story. The page passes plain data only. */
export function PackageEditorForm({
  defaultValues,
  fields,
}: {
  defaultValues: DefaultValues<PackageFormInput>;
  fields: EntityFieldDef<PackageFormInput>[];
}) {
  return (
    <EntityForm
      schema={packageFormSchema}
      defaultValues={defaultValues}
      fields={fields}
      onSubmit={upsertPackage}
      backHref="/admin/packages"
    />
  );
}
