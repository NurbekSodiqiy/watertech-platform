import { afterEach, describe, expect, it, vi } from "vitest";
import { changelogToRow, rowToChangelog, type ChangelogRow } from "@/lib/content/db";
import { changelogSchema } from "@/lib/content/schemas";
import { changelogFormSchema, changelogWriteSchema } from "@/lib/admin/schemas";
import type { ChangelogEntry } from "@/lib/content/types";

const entry: ChangelogEntry = {
  id: "2026-09-chegirmalar",
  publishedOn: "2026-09-02",
  title: "Chegirma darajalari yangilandi",
  body: "Yangi chegirma jadvali kuchga kirdi.",
  linkedPath: "/sales-process/battle-cards",
  approvedBy: "Savdo bo'limi boshlig'i",
  titleRu: "Уровни скидок обновлены",
  bodyRu: "Вступила в силу новая таблица скидок.",
};

function fullRow(patch: Partial<ChangelogRow> = {}): ChangelogRow {
  return {
    ...changelogToRow(entry),
    status: "published",
    sort_order: 0,
    version: 1,
    updated_at: "2026-09-02T08:00:00Z",
    updated_by: "manager@test",
    created_at: "2026-09-02T08:00:00Z",
    ...patch,
  };
}

afterEach(() => vi.restoreAllMocks());

describe("changelog row mapping", () => {
  it("rowToChangelog round-trips changelogToRow", () => {
    expect(rowToChangelog(fullRow())).toEqual(entry);
  });

  it("saves blank optional fields as null and reads them back as absent", () => {
    const bare: ChangelogEntry = { ...entry, linkedPath: undefined, titleRu: "", bodyRu: undefined };
    const row = changelogToRow(bare);
    expect(row.linked_path).toBeNull();
    expect(row.title_ru).toBeNull();
    expect(row.body_ru).toBeNull();

    const back = rowToChangelog(fullRow(row));
    expect(back.linkedPath).toBeUndefined();
    expect(back.titleRu).toBeUndefined();
    expect(back.bodyRu).toBeUndefined();
  });

  it("drops a linked_path that is not a site path instead of throwing", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(rowToChangelog(fullRow({ linked_path: "//evil.example/x" })).linkedPath).toBeUndefined();
    expect(spy).toHaveBeenCalledOnce();
  });
});

describe("changelogSchema", () => {
  it("accepts a full entry and one with only the required fields", () => {
    expect(() => changelogSchema.parse(entry)).not.toThrow();
    const { linkedPath: _l, titleRu: _t, bodyRu: _b, ...required } = entry;
    expect(() => changelogSchema.parse(required)).not.toThrow();
  });

  it.each(["2026-9-2", "02.09.2026", "2026-02-30", "2026-13-01", ""])("rejects the date %j", (publishedOn) => {
    expect(changelogSchema.safeParse({ ...entry, publishedOn }).success).toBe(false);
  });

  it.each(["faq", "//evil.example", "/has space", "https://evil.example"])("rejects the path %j", (linkedPath) => {
    expect(changelogSchema.safeParse({ ...entry, linkedPath }).success).toBe(false);
  });

  it.each(["/", "/faq", "/sales-process/scripts?script=lead-orqali-tushgan"])("accepts the path %j", (linkedPath) => {
    expect(changelogSchema.safeParse({ ...entry, linkedPath }).success).toBe(true);
  });
});

describe("admin write schemas", () => {
  const base = { ...entry, status: "draft" as const };

  it("accepts a valid write", () => {
    expect(() => changelogWriteSchema.parse(base)).not.toThrow();
  });

  it("rejects a bad id and a bad status", () => {
    expect(changelogWriteSchema.safeParse({ ...base, id: "Bad Id" }).success).toBe(false);
    expect(changelogWriteSchema.safeParse({ ...base, status: "archived" }).success).toBe(false);
  });

  it("form schema reads a blank linked page as no link and a blank version as new", () => {
    const parsed = changelogFormSchema.parse({ ...base, linkedPath: "  ", version: "" });
    expect(parsed.linkedPath).toBeUndefined();
    expect(parsed.version).toBeUndefined();
    expect(changelogFormSchema.parse({ ...base, version: "3" }).version).toBe(3);
  });

  it("form schema still rejects a bad linked page", () => {
    expect(changelogFormSchema.safeParse({ ...base, linkedPath: "faq", version: "" }).success).toBe(false);
  });
});
