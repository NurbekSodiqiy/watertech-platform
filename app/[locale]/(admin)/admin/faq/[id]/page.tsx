import { unstable_setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { History } from "lucide-react";
import { getFaqRow } from "@/lib/admin/queries";
import { faqFormSchema, type FaqFormInput } from "@/lib/admin/schemas";
import { upsertFaq } from "@/lib/admin/actions/faq";
import { EntityForm, type EntityFieldDef } from "@/components/admin/EntityForm";

export const metadata = { title: "Kontent boshqaruvi — FAQ tahrirlash" };

function buildFields(isNew: boolean): EntityFieldDef<FaqFormInput>[] {
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
    { kind: "textarea", name: "questionRu", label: "Savol", rows: 2, group: "ru" },
    { kind: "textarea", name: "answerRu", label: "Javob", rows: 6, group: "ru" },
    { kind: "hidden", name: "version" },
  ];
}

export default async function AdminFaqEditPage({
  params,
  searchParams,
}: {
  params: { locale: string; id: string };
  searchParams: { question?: string };
}) {
  const { locale } = params;
  unstable_setRequestLocale(locale);

  const isNew = params.id === "new";
  const row = isNew ? null : await getFaqRow(params.id);
  if (!isNew && !row) notFound();

  const defaultValues: FaqFormInput = row
    ? {
        id: row.id,
        category: row.category,
        question: row.question,
        answer: row.answer,
        status: row.status,
        questionRu: row.question_ru ?? "",
        answerRu: row.answer_ru ?? "",
        version: String(row.version),
      }
    : {
        id: "",
        category: "",
        // Prefilled from the Sifat tab's "FAQ yaratish" quick action
        // (/admin/faq/new?question=…) — a zero-result search query the
        // manager is turning straight into a new FAQ entry.
        question: searchParams.question ?? "",
        answer: "",
        status: "draft",
        questionRu: "",
        answerRu: "",
      };

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
