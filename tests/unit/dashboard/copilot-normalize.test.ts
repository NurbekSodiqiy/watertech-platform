import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { normalizeSearchText } from "@/lib/search/normalize";

// supabase/tests/copilot-checks.sql asserts private.copilot_normalize_question()
// (0019) against the corpus below; this file asserts normalizeSearchText() —
// the function the SQL claims to mirror — against the very same JSON. Either
// side drifting fails one of the two suites.

const CHECKS = readFileSync(path.resolve(__dirname, "../../../supabase/tests/copilot-checks.sql"), "utf8");

const corpusSchema = z.array(z.object({ question: z.string(), key: z.string() }));

function readCorpus(): z.infer<typeof corpusSchema> {
  const match = /'copilot_checks\.corpus', \$corpus\$([\s\S]*?)\$corpus\$/.exec(CHECKS);
  if (!match?.[1]) throw new Error("no $corpus$ block in copilot-checks.sql");
  return corpusSchema.parse(JSON.parse(match[1]));
}

describe("copilot question normalization corpus", () => {
  const corpus = readCorpus();

  it("covers the cases the SQL had to reimplement", () => {
    expect(corpus.length).toBeGreaterThanOrEqual(20);
    const questions = corpus.map((pair) => pair.question).join("\n");
    // Cyrillic, every apostrophe glyph, NBSP / em space / BOM, and an empty result.
    for (const probe of ["Нарх", "‘", "’", "ʻ", "ʼ", "`", " ", " ", "﻿", "　"]) {
      expect(questions, JSON.stringify(probe)).toContain(probe);
    }
    expect(corpus.some((pair) => pair.key === "")).toBe(true);
  });

  it.each(readCorpus().map((pair) => [JSON.stringify(pair.question), pair] as const))(
    "normalizeSearchText(%s) is the expected grouping key",
    (_label, pair) => {
      expect(normalizeSearchText(pair.question)).toBe(pair.key);
    }
  );
});
