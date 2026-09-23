"use client";

import dynamic from "next/dynamic";
import type { DefaultValues } from "react-hook-form";
import { EntityForm, type EntityFieldDef } from "@/components/admin/EntityForm";
import { objectionFormSchema, type ObjectionFormInput } from "@/lib/admin/schemas";
import { upsertObjection } from "@/lib/admin/actions/objections";
import type { ContentBundle } from "@/lib/content/loader";

// Only mounted behind the preview toggle, and pulls in ScriptTurnList/ScriptTurns
// on top of itself — loaded on demand rather than adding that weight to every
// objection editor page load (CLAUDE.md §4, same pattern EntityForm's own
// ImageUploadField uses).
const DraftPreview = dynamic(() => import("@/components/admin/DraftPreview").then((m) => m.DraftPreview));

/** No script/objection/FAQ/competitor/package data is loaded on this page
 * (only the one objection row) — objectionToTurns' output never carries a
 * chip link, so an empty bundle resolves nothing and needs to resolve
 * nothing. */
const EMPTY_BUNDLE: ContentBundle = { scripts: [], objections: [], faqs: [], competitors: [], packageGroups: [] };

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

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
      titleField="label"
      table="content_objections"
      renderPreview={(values: ObjectionFormInput, open, onClose) => (
        <DraftPreview
          kind="objection"
          open={open}
          onClose={onClose}
          title={values.label || values.id}
          objection={{
            id: values.id,
            label: values.label,
            keywords: splitCsv(values.keywords),
            clientSays: values.clientSays,
            realMeaning: values.realMeaning,
            response: values.response,
            followUp: values.followUp || undefined,
            scriptIds: splitCsv(values.scriptIds),
          }}
          bundle={EMPTY_BUNDLE}
        />
      )}
    />
  );
}
