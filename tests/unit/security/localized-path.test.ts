import { describe, expect, it } from "vitest";
import { localeOrDefault, localizedPath } from "@/lib/i18n/localized-path";

describe("localeOrDefault", () => {
  it("accepts only an exact routing locale", () => {
    expect(localeOrDefault("ru")).toBe("ru");
    expect(localeOrDefault("uz")).toBe("uz");
  });

  it("falls back to the default for anything else", () => {
    for (const value of [null, undefined, "", "RU", "en", "ru/../admin", "//evil.example.com", "https://evil.example.com"]) {
      expect(localeOrDefault(value)).toBe("uz");
    }
  });
});

describe("localizedPath", () => {
  it("prefixes only the non-default locale", () => {
    expect(localizedPath("/login", "uz")).toBe("/login");
    expect(localizedPath("/login", "ru")).toBe("/ru/login");
    expect(localizedPath("/dashboard", "ru")).toBe("/ru/dashboard");
  });
});
