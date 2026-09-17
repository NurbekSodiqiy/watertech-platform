import { describe, expect, it } from "vitest";
import {
  ERROR_MARKER,
  SOURCES_MARKER,
  answerForClipboard,
  citedNumbers,
  parseCopilotStream,
} from "@/lib/copilot/protocol";
import { buildSystemInstruction, buildUserMessage, notInKnowledgeBase } from "@/lib/copilot/prompt";
import { copilotRequestSchema } from "@/lib/copilot/schema";

describe("parseCopilotStream", () => {
  it("holds back a partially received marker", () => {
    expect(parseCopilotStream("Javob matni [1]\n\n@@SOU").answer).toBe("Javob matni [1]");
    expect(parseCopilotStream("Javob @").answer).toBe("Javob");
  });

  it("parses the sources trailer", () => {
    const sources = [{ n: 1, title: "Narxi qimmat", href: "/sales-process/scripts?tab=faq", type: "faq" }];
    const parsed = parseCopilotStream(`Javob [1]\n\n${SOURCES_MARKER}${JSON.stringify(sources)}`);
    expect(parsed).toEqual({ answer: "Javob [1]", sources, complete: true, failed: false });
  });

  it("is incomplete while the sources JSON is still arriving", () => {
    const parsed = parseCopilotStream(`Javob\n\n${SOURCES_MARKER}[{"n":1,`);
    expect(parsed.complete).toBe(false);
    expect(parsed.answer).toBe("Javob");
  });

  it("flags a mid-stream error and keeps the partial answer", () => {
    expect(parseCopilotStream(`Qisman javob\n${ERROR_MARKER}`)).toEqual({
      answer: "Qisman javob",
      sources: [],
      complete: true,
      failed: true,
    });
  });
});

describe("citations", () => {
  it("lists cited block numbers once, in order", () => {
    expect(citedNumbers("A [2] va B [1]. Manbalar: [2] [1]")).toEqual([2, 1]);
  });

  it("strips citations and markdown for the clipboard", () => {
    expect(answerForClipboard("**Narx** qimmat emas [1].\n\n## Izoh\nSifat bor [2]\n\n[1] [2]")).toBe(
      "Narx qimmat emas.\n\nIzoh\nSifat bor"
    );
  });
});

describe("prompt", () => {
  it("embeds the localized refusal and answer language", () => {
    expect(buildSystemInstruction("uz")).toContain(`say exactly: ${notInKnowledgeBase("uz")} and stop.`);
    expect(buildSystemInstruction("uz")).toContain("Answer in Uzbek (Latin script)");
    expect(buildSystemInstruction("ru")).toContain("Answer in Russian");
  });

  it("numbers context blocks and ends with the question", () => {
    const message = buildUserMessage("Kafolat qancha?", [
      { id: "faq:a", type: "faq", title: "Kafolat", text: "10 yil", href: "/x" },
      { id: "product:b", type: "product", title: "Труба ППР", text: "Sizes: Ø20", href: "/products" },
    ]);
    expect(message).toBe(
      "### [1] faq — Kafolat\n10 yil\n\n### [2] product — Труба ППР\nSizes: Ø20\n\nQUESTION: Kafolat qancha?"
    );
  });
});

describe("copilotRequestSchema", () => {
  it("trims, defaults history, and bounds sizes", () => {
    expect(copilotRequestSchema.parse({ question: "  narx?  ", locale: "uz" })).toEqual({
      question: "narx?",
      locale: "uz",
      history: [],
    });
    expect(copilotRequestSchema.safeParse({ question: "ab", locale: "uz" }).success).toBe(false);
    expect(copilotRequestSchema.safeParse({ question: "narx", locale: "en" }).success).toBe(false);
    const turn = { role: "user", content: "x" };
    expect(copilotRequestSchema.safeParse({ question: "narx", locale: "ru", history: Array(7).fill(turn) }).success).toBe(
      false
    );
  });
});
