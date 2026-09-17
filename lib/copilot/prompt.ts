import type { Locale } from "@/i18n/routing";
import type { CopilotChunk } from "@/lib/copilot/docs";

const NOT_IN_KNOWLEDGE_BASE: Record<Locale, string> = {
  uz: "Bu ma'lumot bazada yo'q — menejerdan so'rang",
  ru: "Этой информации нет в базе — уточните у менеджера",
};

const ANSWER_LANGUAGE: Record<Locale, string> = {
  uz: "Uzbek (Latin script)",
  ru: "Russian",
};

/** The exact refusal sentence — also streamed by the route itself, without
 * calling the model, when retrieval finds nothing. */
export function notInKnowledgeBase(locale: Locale): string {
  return NOT_IN_KNOWLEDGE_BASE[locale];
}

export function buildSystemInstruction(locale: Locale): string {
  return [
    "You are WaterTech's internal sales copilot. Answer ONLY from the CONTEXT blocks.",
    `If the answer is not in the context, say exactly: ${NOT_IN_KNOWLEDGE_BASE[locale]} and stop.`,
    "Never invent prices, discounts, sizes, delivery terms or certificates.",
    `Answer in ${ANSWER_LANGUAGE[locale]} in ≤ 120 words, as a sales operator would say it on the phone.`,
    "After the answer, list the sources you used as `[n]` referring to the CONTEXT block numbers.",
    "Keep product names as written in the context.",
    "Do not use markdown headings or tables; plain sentences only.",
  ].join("\n");
}

export function buildUserMessage(question: string, chunks: CopilotChunk[]): string {
  const blocks = chunks.map((chunk, i) => `### [${i + 1}] ${chunk.type} — ${chunk.title}\n${chunk.text}`);
  return `${blocks.join("\n\n")}\n\nQUESTION: ${question}`;
}
