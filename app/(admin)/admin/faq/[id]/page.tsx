import Link from "next/link";
import { notFound } from "next/navigation";
import { History } from "lucide-react";
import { getFaqRow } from "@/lib/admin/queries";
import { faqFormSchema, type FaqFormValues } from "@/lib/admin/schemas";
import { upsertFaq } from "@/lib/admin/actions/faq";
import { EntityForm, type EntityFieldDef } from "@/components/admin/EntityForm";

export const metadata = { title: "Kontent boshqaruvi — FAQ tahrirlash" };

function buildFields(isNew: boolean): EntityFieldDef<FaqFormValues>[] {
  return [
    { kind: "text", name: "id", label: "ID (slug)", placeholder: "masalan: yetkazib-berish-muddati", readOnly: !isNew },
    { kind: "text", name: "category", label: "Kategoriya" },
    { kind: "textarea", name: "question", label: "Savol", rows: 2 },
    { kind: "textarea", name: "answer", label: "Javob", rows: 6 },
    {
      kind: "select",
      name: "status",
      label: "Holat",
      options: [
        { value: "draft", label: "Qoralama" },
        { value: "published", label: "Nashr etilgan" },
      ],
    },
  ];
}

export default async function AdminFaqEditPage({ params }: { params: { id: string } }) {
  const isNew = params.id === "new";
  const row = isNew ? null : await getFaqRow(params.id);
  if (!isNew && !row) notFound();

  const defaultValues: FaqFormValues = row
    ? { id: row.id, category: row.category, question: row.question, answer: row.answer, status: row.status }
    : { id: "", category: "", question: "", answer: "", status: "draft" };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">{isNew ? "Yangi FAQ" : "FAQ tahrirlash"}</h1>
        {!isNew && row && (
          <Link
            href={`/admin/versions/content_faqs/${row.id}`}
            className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline"
          >
            <History size={13} />
            Versiyalar tarixi
          </Link>
        )}
      </div>
      <EntityForm
        schema={faqFormSchema}
        defaultValues={defaultValues}
        fields={buildFields(isNew)}
        onSubmit={upsertFaq}
        backHref="/admin/faq"
      />
    </div>
  );
}
