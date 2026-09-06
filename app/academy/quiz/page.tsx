import { PageHeader } from "@/components/DocPageTemplate";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { Quiz } from "@/components/Quiz";
import { getMockMeta } from "@/lib/site-config";
import { salesQuizQuestions } from "@/lib/mock-data/quiz";

export default function QuizPage() {
  const meta = getMockMeta("/academy/quiz");
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <PageHeader
        path="/academy/quiz"
        title="Bilim testi"
        description="Skriptlar va e'tirozlar bo'yicha bilimingizni tekshiring."
        meta={meta}
      />
      <Quiz questions={salesQuizQuestions} />
      <FeedbackWidget />
    </div>
  );
}
