import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MIDDLEWARE_MATCHER } from "@/lib/security/middleware-matcher";

// middleware.ts's config.matcher must stay a string literal (Next.js
// statically analyses it), so it can't import MIDDLEWARE_MATCHER directly —
// this reads the source file as text and extracts the literal instead, the
// same technique tests/unit/security/csp-parity.test.ts uses to keep a
// duplicated definition in sync.
function extractMatcherLiteral(source: string): string {
  const match = source.match(/matcher:\s*\[\s*("(?:[^"\\]|\\.)*")\s*,?\s*\]/);
  if (!match) throw new Error("Could not find config.matcher literal in middleware.ts");
  return JSON.parse(match[1]) as string;
}

describe("middleware matcher parity", () => {
  it("middleware.ts's config.matcher literal equals MIDDLEWARE_MATCHER", () => {
    const middlewareSource = readFileSync(path.resolve(__dirname, "../../../middleware.ts"), "utf8");
    expect(extractMatcherLiteral(middlewareSource)).toBe(MIDDLEWARE_MATCHER);
  });
});
