import { unstable_setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { History } from "lucide-react";
import { getObjectionRow } from "@/lib/admin/queries";
import { objectionFormSchema, type ObjectionFormInput } from "@/lib/admin/schemas";
import { upsertObjection } from "@/lib/admin/actions/objections";
import { EntityForm, type EntityFieldDef } from "@/components/admin/EntityForm";

export const metadata = { title: "Kontent boshqaruvi — E'tiroz tahrirlash" };

function buildFields(isNew: boolean): EntityFieldDef<ObjectionFormInput>[] {
  return [
    { kind: "text", name: "id", label: "ID (slug)", placeholder: "masalan: obj-qimmat", readOnly: !isNew },
    { kind: "text", name: "label", label: "Nomi" },
    { kind: "csv", name: "keywords", label: "Kalit so'zlar", hint: "Vergul bilan ajrating: qimmat, narx, chegirma" },
    { kind: "textarea", name: "clientSays", label: "Mijoz aytadi", rows: 2 },
    { kind: "textarea", name: "realMeaning", label: "Aslida nima demoqchi", rows: 2 },
    { kind: "textarea", name: "response", label: "Javob", rows: 4 },
    { kind: "textarea", name: "followUp", label: "Qo'shimcha (ixtiyoriy)", rows: 2 },
    { kind: "csv", name: "scriptIds", label: "Skript ID'lari", hint: "Vergul bilan ajrating" },
    {
      kind: "select",
      name: "status",
      label: "Holat",
      options: [
        { value: "draft", label: "Qoralama" },
        { value: "published", label: "Nashr etilgan" },
      ],
    },
    { kind: "text", name: "labelRu", label: "Nomi", group: "ru" },
    { kind: "textarea", name: "clientSaysRu", label: "Mijoz aytadi", rows: 2, group: "ru" },
    { kind: "textarea", name: "realMeaningRu", label: "Aslida nima demoqchi", rows: 2, group: "ru" },
    { kind: "textarea", name: "responseRu", label: "Javob", rows: 4, group: "ru" },
    { kind: "textarea", name: "followUpRu", label: "Qo'shimcha (ixtiyoriy)", rows: 2, group: "ru" },
    { kind: "hidden", name: "version" },
  ];
}

export default async function AdminObjectionEditPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  const { locale } = params;
  unstable_setRequestLocale(locale);

  const isNew = params.id === "new";
  const row = isNew ? null : await getObjectionRow(params.id);
  if (!isNew && !row) notFound();

  const defaultValues: ObjectionFormInput = row
    ? {
        id: row.id,
        label: row.label,
        keywords: row.keywords.join(", "),
        clientSays: row.client_says,
        realMeaning: row.real_meaning,
        response: row.response,
        followUp: row.follow_up ?? "",
        scriptIds: row.script_ids.join(", "),
        status: row.status,
        labelRu: row.label_ru ?? "",
        clientSaysRu: row.client_says_ru ?? "",
        realMeaningRu: row.real_meaning_ru ?? "",
        responseRu: row.response_ru ?? "",
        followUpRu: row.follow_up_ru ?? "",
        version: String(row.version),
      }
    : {
        id: "",
        label: "",
        keywords: "",
        clientSays: "",
        realMeaning: "",
        response: "",
        followUp: "",
        scriptIds: "",
        status: "draft",
        labelRu: "",
        clientSaysRu: "",
        realMeaningRu: "",
        responseRu: "",
        followUpRu: "",
      };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">{isNew ? "Yangi e'tiroz" : "E'tirozni tahrirlash"}</h1>
        {!isNew && row && (
          <Link
            href={`/admin/versions/content_objections/${row.id}`}
            className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline"
          >
            <History size={13} />
            Versiyalar tarixi
          </Link>
        )}
      </div>
      <EntityForm
        schema={objectionFormSchema}
        defaultValues={defaultValues}
        fields={buildFields(isNew)}
        onSubmit={upsertObjection}
        backHref="/admin/objections"
      />
    </div>
  );
}
