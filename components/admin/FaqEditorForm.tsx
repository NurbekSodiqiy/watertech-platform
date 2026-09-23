"use client";

import type { DefaultValues } from "react-hook-form";
import { EntityForm, type EntityFieldDef } from "@/components/admin/EntityForm";
import { faqFormSchema, type FaqFormInput } from "@/lib/admin/schemas";
import { upsertFaq } from "@/lib/admin/actions/faq";

/** Client boundary for the editor at /admin/faq/[id]. The zod schema cannot be
 * passed from the Server Component page as a prop (React will not serialize a
 * class instance), so it is bound here together with its save action — see
 * ProductEditorForm for the full story. The page passes plain data only. */
export function FaqEditorForm({
  defaultValues,
  fields,
}: {
  defaultValues: DefaultValues<FaqFormInput>;
  fields: EntityFieldDef<FaqFormInput>[];
}) {
  return (
    <EntityForm
      schema={faqFormSchema}
      defaultValues={defaultValues}
      fields={fields}
      onSubmit={upsertFaq}
      backHref="/admin/faq"
    />
  );
}
