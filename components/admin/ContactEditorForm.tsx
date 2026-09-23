"use client";

import type { DefaultValues } from "react-hook-form";
import { EntityForm, type EntityFieldDef } from "@/components/admin/EntityForm";
import { contactFormSchema, type ContactFormInput } from "@/lib/admin/schemas";
import { upsertContact } from "@/lib/admin/actions/contacts";

/** Client boundary for the editor at /admin/contacts/[id]. The zod schema cannot be
 * passed from the Server Component page as a prop (React will not serialize a
 * class instance), so it is bound here together with its save action — see
 * ProductEditorForm for the full story. The page passes plain data only. */
export function ContactEditorForm({
  defaultValues,
  fields,
}: {
  defaultValues: DefaultValues<ContactFormInput>;
  fields: EntityFieldDef<ContactFormInput>[];
}) {
  return (
    <EntityForm
      schema={contactFormSchema}
      defaultValues={defaultValues}
      fields={fields}
      onSubmit={upsertContact}
      backHref="/admin/contacts"
      titleField="name"
      table="content_contacts"
    />
  );
}
