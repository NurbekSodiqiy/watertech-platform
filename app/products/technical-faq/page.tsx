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
  { id: "tf-1", question: "[Placeholder technical question about tolerances?]", answer: "[Placeholder answer.]", relatedProduct: "[Product Line A]" },
  { id: "tf-2", question: "[Placeholder technical question about certifications?]", answer: "[Placeholder answer.]", relatedProduct: "[Product Line B]" },
  { id: "tf-3", question: "[Placeholder technical question about installation?]", answer: "[Placeholder answer.]", relatedProduct: "[Product Line C]" },
  { id: "tf-4", question: "[Placeholder technical question about compatibility?]", answer: "[Placeholder answer.]", relatedProduct: "[Product Line D]" },
];

const columns: DbColumn[] = [
  { key: "question", label: "Question" },
  { key: "answer", label: "Answer" },
  { key: "relatedProduct", label: "Related Product" },
];

export default function TechnicalFaqPage() {
  const meta = getMockMeta("/products/technical-faq");
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <PageHeader
        path="/products/technical-faq"
        title="Technical FAQ"
        description="Product-specific technical questions and answers."
        meta={meta}
      />
      <DatabaseTemplate columns={columns} rows={rows} />
    </div>
  );
}
