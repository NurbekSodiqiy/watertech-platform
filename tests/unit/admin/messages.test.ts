import { describe, expect, it } from "vitest";
import uz from "@/messages/uz.json";
import ru from "@/messages/ru.json";
import { VALIDATION_KEYS } from "@/lib/admin/validation";

// An admin write answers with a code, never a sentence (lib/admin/errors.ts),
// so a code with no message is a manager staring at a raw key. The general
// uz ⇄ ru parity test cannot catch that: a key missing from *both* files is
// still "in parity".

/** Kept in step with AdminErrorCode by hand — a type union has no runtime
 * form, and listing it here is what makes a forgotten message fail. */
const ERROR_CODES = [
  "unauthorized",
  "validation",
  "id_taken",
  "version_conflict",
  "gate_blocked",
  "not_found",
  "reference_in_use",
  "email_taken",
  "last_manager",
  "self_change",
  "auth_sync_failed",
  "unknown",
] as const;

const LOCALES = { uz, ru } as const;

function namespace(messages: typeof uz, key: "errors" | "validation"): Record<string, string> {
  return messages.admin[key];
}

describe("admin error and validation messages", () => {
  it("has a message for every AdminErrorCode in both locales", () => {
    for (const [locale, messages] of Object.entries(LOCALES)) {
      const present = Object.keys(namespace(messages, "errors"));
      expect({ locale, missing: ERROR_CODES.filter((code) => !present.includes(code)) }).toEqual({
        locale,
        missing: [],
      });
    }
  });

  it("has a message for every validation key in both locales", () => {
    for (const [locale, messages] of Object.entries(LOCALES)) {
      const present = Object.keys(namespace(messages, "validation"));
      expect({ locale, missing: VALIDATION_KEYS.filter((key) => !present.includes(key)) }).toEqual({
        locale,
        missing: [],
      });
    }
  });

  it("carries no message that no code or key can produce", () => {
    for (const [locale, messages] of Object.entries(LOCALES)) {
      const staleErrors = Object.keys(namespace(messages, "errors")).filter(
        (key) => !ERROR_CODES.includes(key as (typeof ERROR_CODES)[number])
      );
      const staleValidation = Object.keys(namespace(messages, "validation")).filter(
        (key) => !VALIDATION_KEYS.includes(key as (typeof VALIDATION_KEYS)[number])
      );
      expect({ locale, staleErrors, staleValidation }).toEqual({ locale, staleErrors: [], staleValidation: [] });
    }
  });

  it("says something different per code (no copy-pasted placeholder)", () => {
    for (const [locale, messages] of Object.entries(LOCALES)) {
      const values = Object.values(namespace(messages, "errors"));
      expect({ locale, unique: new Set(values).size }).toEqual({ locale, unique: values.length });
    }
  });
});
