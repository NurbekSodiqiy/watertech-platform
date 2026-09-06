"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import type { QuizQuestion } from "@/lib/mock-data/quiz";

export function Quiz({ questions }: { questions: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});

  return (
    <div className="space-y-4">
      {questions.map((q, qi) => {
        const selected = answers[qi];
        const answered = selected !== undefined;

        return (
          <div key={qi} className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
            <p className="mb-3 text-[14px] font-semibold text-primary-dark">
              {qi + 1}-savol. {q.question}
            </p>
            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const isCorrect = oi === q.correctIndex;
                const isSelected = selected === oi;
                return (
                  <button
                    key={oi}
                    type="button"
                    onClick={() => !answered && setAnswers((prev) => ({ ...prev, [qi]: oi }))}
                    disabled={answered}
                    className={`flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[13.5px] ${
                      answered && isCorrect
                        ? "border-status-ok bg-status-ok/10 text-primary-dark"
                        : answered && isSelected && !isCorrect
                          ? "border-status-outdated bg-status-outdated/10 text-primary-dark"
                          : "border-border bg-surface-alt text-text-secondary hover:bg-primary/5"
                    }`}
                  >
                    {answered && isCorrect && <Check size={16} className="mt-0.5 shrink-0 text-status-ok" />}
                    {answered && isSelected && !isCorrect && (
                      <X size={16} className="mt-0.5 shrink-0 text-status-outdated" />
                    )}
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            {answered && (
              <p className="mt-3 rounded-lg bg-primary/5 p-3 text-[13px] text-text-secondary">
                <span className="font-semibold text-primary-dark">Tushuntirish: </span>
                {q.explanation}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
