import { PageHeader } from "@/components/DocPageTemplate";
import { DatabaseTemplate, DbColumn } from "@/components/DatabaseTemplate";
import { getMockMeta } from "@/lib/site-config";

interface TechFaq {
  id: string;
  question: string;
  answer: string;
  relatedProduct: string;
}

const rows: TechFaq[] = [
  { id: "tf-1", question: "[Ruxsat etilgan chegaralar haqidagi joy egallovchi texnik savol?]", answer: "[Joy egallovchi javob.]", relatedProduct: "[A turkumi]" },
  { id: "tf-2", question: "[Sertifikatlar haqidagi joy egallovchi texnik savol?]", answer: "[Joy egallovchi javob.]", relatedProduct: "[B turkumi]" },
  { id: "tf-3", question: "[O'rnatish haqidagi joy egallovchi texnik savol?]", answer: "[Joy egallovchi javob.]", relatedProduct: "[C turkumi]" },
  { id: "tf-4", question: "[Moslik haqidagi joy egallovchi texnik savol?]", answer: "[Joy egallovchi javob.]", relatedProduct: "[D turkumi]" },
];

const columns: DbColumn[] = [
  { key: "question", label: "Savol" },
  { key: "answer", label: "Javob" },
  { key: "relatedProduct", label: "Bog'liq mahsulot" },
];

export default function TechnicalFaqPage() {
  const meta = getMockMeta("/products/technical-faq");
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <PageHeader
        path="/products/technical-faq"
        title="Texnik savol-javob"
        description="Mahsulotga oid texnik savol va javoblar."
        meta={meta}
      />
      <DatabaseTemplate columns={columns} rows={rows} />
    </div>
  );
}
