import { afterEach, describe, expect, it, vi } from "vitest";
import { contactToRow, rowToContact, type ContactRow } from "@/lib/content/db";
import { contactSchema } from "@/lib/content/schemas";
import { contactFormSchema, contactWriteSchema } from "@/lib/admin/schemas";
import { contacts } from "@/lib/content/contacts";
import { runChecks } from "@/lib/agents/publish-gate/checks";
import { gateContext } from "../../fixtures/content";
import type { Contact } from "@/lib/content/types";

const contact: Contact = {
  id: "logistics",
  name: "Aziz Karimov",
  role: "Logistika koordinatori",
  topic: "Yetkazib berish va ombor bo'yicha savollar",
  phone: "+998 90 123 45 67",
  messenger: "@watertech_logistika",
  roleRu: "Координатор по логистике",
  topicRu: "Вопросы по доставке и складу",
};

function fullRow(patch: Partial<ContactRow> = {}): ContactRow {
  return {
    ...contactToRow(contact),
    status: "published",
    sort_order: 0,
    version: 1,
    updated_at: "2026-09-20T08:00:00Z",
    updated_by: "manager@test",
    created_at: "2026-09-20T08:00:00Z",
    ...patch,
  };
}

afterEach(() => vi.restoreAllMocks());

describe("contact row mapping", () => {
  it("rowToContact round-trips contactToRow", () => {
    expect(rowToContact(fullRow())).toEqual(contact);
  });

  it("saves blank Russian twins as null and reads them back as absent", () => {
    const row = contactToRow({ ...contact, roleRu: "", topicRu: undefined });
    expect(row.role_ru).toBeNull();
    expect(row.topic_ru).toBeNull();
    const back = rowToContact(fullRow(row));
    expect(back.roleRu).toBeUndefined();
    expect(back.topicRu).toBeUndefined();
  });

  it("blanks a malformed phone or handle instead of throwing", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const back = rowToContact(fullRow({ phone: "call me", messenger: "https://evil.example" }));
    expect(back.phone).toBe("");
    expect(back.messenger).toBe("");
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe("contactSchema", () => {
  it("accepts every seed contact", () => {
    for (const seed of contacts) expect(() => contactSchema.parse(seed), seed.id).not.toThrow();
  });

  it("gives every seed contact a distinct slug id", () => {
    const ids = contacts.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it.each(["+998901234567", "+998 90 123 45 67", "+998-90-123-45-67", "+998 00 000 00 00", "105", "23", "12345"])(
    "accepts the phone %j",
    (phone) => {
      expect(contactSchema.safeParse({ ...contact, phone }).success).toBe(true);
    }
  );

  it.each(["", "+1 (000) 000-0000", "+998 90 123 45", "+998 90 123 45 678", "998901234567", "1", "123456", "+998 90 123 45 67 ext 1", "tel:105"])(
    "rejects the phone %j",
    (phone) => {
      expect(contactSchema.safeParse({ ...contact, phone }).success).toBe(false);
    }
  );

  it.each(["", "watertech", "@abc", "@1watertech", "@water tech", "@water/tech", "https://t.me/watertech", `@${"a".repeat(33)}`])(
    "rejects the handle %j",
    (messenger) => {
      expect(contactSchema.safeParse({ ...contact, messenger }).success).toBe(false);
    }
  );
});

describe("admin write schemas", () => {
  const base = { ...contact, status: "draft" as const };

  it("accepts a valid write", () => {
    expect(() => contactWriteSchema.parse(base)).not.toThrow();
  });

  it("rejects a bad id, status, phone and handle", () => {
    expect(contactWriteSchema.safeParse({ ...base, id: "Bad Id" }).success).toBe(false);
    expect(contactWriteSchema.safeParse({ ...base, status: "archived" }).success).toBe(false);
    expect(contactWriteSchema.safeParse({ ...base, phone: "+1 (000) 000-0000" }).success).toBe(false);
    expect(contactWriteSchema.safeParse({ ...base, messenger: "watertech" }).success).toBe(false);
  });

  it("form schema reads a blank version as new and a numeric one as that version", () => {
    expect(contactFormSchema.parse({ ...base, version: "" }).version).toBeUndefined();
    expect(contactFormSchema.parse({ ...base, version: "3" }).version).toBe(3);
  });
});

describe("publish gate", () => {
  const target = { table: "content_contacts" as const, row: contactToRow(contact) };

  it("passes a complete contact, warning only about missing Russian", () => {
    const result = runChecks(target, gateContext());
    expect(result.passed).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("blocks a blank required field and a malformed phone", () => {
    const result = runChecks(
      { table: "content_contacts", row: { ...target.row, name: " ", phone: "+1 (000) 000-0000" } },
      gateContext()
    );
    expect(result.passed).toBe(false);
    expect(result.issues.map((i) => `${i.code}:${i.field}`)).toEqual(
      expect.arrayContaining(["required_blank:name", "schema_invalid:phone"])
    );
  });

  it("warns, without blocking, when the Russian twins are blank", () => {
    const result = runChecks(
      { table: "content_contacts", row: { ...target.row, role_ru: null, topic_ru: "" } },
      gateContext()
    );
    expect(result.passed).toBe(true);
    expect(result.issues.map((i) => i.field)).toEqual(["role_ru", "topic_ru"]);
  });
});
