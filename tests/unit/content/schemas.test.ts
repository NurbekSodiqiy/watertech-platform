import { describe, expect, it } from "vitest";
import { scripts } from "@/lib/content/scripts";
import { objections } from "@/lib/content/objections";
import { faqs } from "@/lib/content/faq";
import { competitors } from "@/lib/content/competitors";
import { packageGroups } from "@/lib/content/packages";
import { validateContentBundle } from "@/lib/content/schemas";

describe("validateContentBundle", () => {
  it("accepts the real content bundle", () => {
    expect(() =>
      validateContentBundle({ scripts, objections, faqs, competitors, packageGroups })
    ).not.toThrow();
  });
});
