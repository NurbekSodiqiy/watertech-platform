import { describe, expect, it } from "vitest";
import { withClientName, type SuggestedSlots } from "@/components/ScriptTurns";

const slots: SuggestedSlots = {
  slot1: "dushanba, 1-yanvar, soat 10:00",
  slot2: "seshanba, 2-yanvar, soat 15:00",
  hour1: "10:00",
  hour2: "15:00",
};

describe("withClientName", () => {
  it("fills the client-name placeholder", () => {
    expect(withClientName("____ aka", "Ali", null)).toBe("Ali aka");
  });

  it("leaves text without a placeholder unchanged when there is no client name", () => {
    expect(withClientName("Xayrli kun", undefined, null)).toBe("Xayrli kun");
  });

  it("maps date/time placeholders to neutral text when slots is null", () => {
    const text = "Uchrashuv: [Kun va Vaqt] yoki [Boshqa Kun va Vaqt], soat [soat].";
    expect(withClientName(text, undefined, null)).toBe(
      "Uchrashuv: kun va vaqt yoki boshqa kun va vaqt, soat soat."
    );
  });

  it("maps date/time placeholders to the suggested slots when provided", () => {
    const text = "Uchrashuv: [Kun va Vaqt] yoki [Boshqa Kun va Vaqt], soat [soat] yoki [soat].";
    expect(withClientName(text, undefined, slots)).toBe(
      `Uchrashuv: ${slots.slot1} yoki ${slots.slot2}, soat ${slots.hour1} yoki ${slots.hour2}.`
    );
  });
});
