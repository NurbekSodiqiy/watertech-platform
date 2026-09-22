import { describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { contentActions, type ContentActionDeps } from "@/lib/admin/actions/factory";
import { CONTENT_REGISTRY } from "@/lib/admin/registry";
import { AdminActionError } from "@/lib/admin/errors";
import type { DynamicTablesDatabase } from "@/lib/supabase/typed";
import type { GateResult } from "@/lib/agents/publish-gate/types";

// Same approach as concurrency.test.ts: the query builder is the real
// supabase-js one and only the network is mocked, so the PostgREST request the
// factory actually sends is what gets asserted — the version filter on an
// update and a delete, and the insert (not upsert) on a create, are the whole
// point of this file.

interface RecordedRequest {
  method: string;
  url: URL;
  body: unknown;
}

interface MockResponse {
  status: number;
  body: unknown;
}

type Responder = (request: RecordedRequest) => MockResponse;

const OK_EMPTY: MockResponse = { status: 201, body: null };

function mockedClient(respond: Responder) {
  const requests: RecordedRequest[] = [];
  const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const rawBody = typeof init?.body === "string" ? init.body : null;
    const request: RecordedRequest = {
      method: init?.method ?? "GET",
      url,
      body: rawBody === null ? null : JSON.parse(rawBody),
    };
    requests.push(request);
    const { status, body } = respond(request);
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  };
  const supabase = createClient<DynamicTablesDatabase>("https://example.supabase.co", "anon-key-anon-key-anon-key", {
    global: { fetch },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { supabase, requests };
}

const PASSED: GateResult = { passed: true, issues: [] };
const BLOCKED: GateResult = {
  passed: false,
  issues: [{ code: "missing_ru", severity: "error", message: "Ruscha tarjima yo'q" }],
};

function testDeps(respond: Responder, gate: { candidate?: GateResult; stored?: GateResult } = {}) {
  const { supabase, requests } = mockedClient(respond);
  const revalidate = vi.fn();
  const runGateOnCandidate = vi.fn(async () => gate.candidate ?? PASSED);
  const runGate = vi.fn(async () => gate.stored ?? PASSED);
  const deps: ContentActionDeps = {
    requireSession: async () => ({ email: "manager@watertech.uz" }),
    client: () => supabase,
    runGate,
    runGateOnCandidate,
    revalidate,
  };
  return { deps, requests, revalidate, runGate, runGateOnCandidate };
}

const faqInput = {
  id: "faq-kafolat",
  category: "Kafolat",
  question: "Kafolat muddati qancha?",
  answer: "10 yil.",
  status: "draft",
};

/** A PostgREST error body — supabase-js reads `code` off it, which is what the
 * factory maps to id_taken / reference_in_use. */
function pgError(code: string, message: string): MockResponse {
  return { status: 409, body: { code, message, details: null, hint: null } };
}

const isSortOrderProbe = (request: RecordedRequest): boolean =>
  request.method === "GET" && request.url.searchParams.get("select") === "sort_order";

const isExistenceProbe = (request: RecordedRequest): boolean =>
  request.method === "GET" && request.url.searchParams.get("select") === "id";

describe("contentActions.create", () => {
  it("inserts a new row with the next sort_order and the session's email", async () => {
    const { deps, requests, revalidate } = testDeps((request) =>
      isSortOrderProbe(request) ? { status: 200, body: [{ sort_order: 4 }] } : OK_EMPTY
    );

    const result = await contentActions(CONTENT_REGISTRY.content_faqs, deps).save(faqInput);

    expect(result).toEqual({ ok: true });
    expect(revalidate).toHaveBeenCalledWith("faqs");

    const insert = requests.find((request) => request.method === "POST");
    expect(insert?.url.pathname).toBe("/rest/v1/content_faqs");
    expect(insert?.body).toEqual({
      id: "faq-kafolat",
      category: "Kafolat",
      question: "Kafolat muddati qancha?",
      answer: "10 yil.",
      question_ru: null,
      answer_ru: null,
      status: "draft",
      sort_order: 5,
      updated_by: "manager@watertech.uz",
    });
    // An upsert would carry Prefer: resolution=merge-duplicates — a create
    // must not silently overwrite a live row with the same id.
    expect(requests.some((request) => request.method === "PATCH")).toBe(false);
  });

  it("starts sort_order at 0 for the first row of a table", async () => {
    const { deps, requests } = testDeps((request) =>
      isSortOrderProbe(request) ? { status: 200, body: [] } : OK_EMPTY
    );

    await contentActions(CONTENT_REGISTRY.content_faqs, deps).create(faqInput);

    const insert = requests.find((request) => request.method === "POST");
    expect(insert?.body).toMatchObject({ sort_order: 0 });
  });

  it("scopes a package's sort_order to its group", async () => {
    const { deps, requests } = testDeps((request) =>
      isSortOrderProbe(request) ? { status: 200, body: [{ sort_order: 1 }] } : OK_EMPTY
    );

    const result = await contentActions(CONTENT_REGISTRY.content_packages, deps).create({
      id: "pkg-start",
      groupId: "grp-boshlangich",
      name: "Boshlang'ich",
      isFeatured: false,
      orderVolume: "10 mln",
      paymentTerms: "50% oldindan",
      estimatedDiscount: "5%",
      logistics: "O'z transporti",
      deliveryTime: "3 kun",
      discountPct: 5,
      advancePct: 50,
      status: "draft",
    });

    expect(result).toEqual({ ok: true });
    const probe = requests.find(isSortOrderProbe);
    expect(probe?.url.searchParams.get("group_id")).toBe("eq.grp-boshlangich");
    expect(requests.find((request) => request.method === "POST")?.body).toMatchObject({
      group_id: "grp-boshlangich",
      sort_order: 2,
    });
  });

  it("maps a unique violation to id_taken instead of overwriting", async () => {
    const { deps, revalidate } = testDeps((request) =>
      isSortOrderProbe(request)
        ? { status: 200, body: [{ sort_order: 0 }] }
        : pgError("23505", 'duplicate key value violates unique constraint "content_faqs_pkey"')
    );

    const result = await contentActions(CONTENT_REGISTRY.content_faqs, deps).create(faqInput);

    expect(result).toEqual({ ok: false, code: "id_taken", field: "id" });
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("never returns the database's own message", async () => {
    const { deps } = testDeps((request) =>
      isSortOrderProbe(request)
        ? { status: 200, body: [{ sort_order: 0 }] }
        : pgError("42501", "permission denied for table content_faqs")
    );

    const result = await contentActions(CONTENT_REGISTRY.content_faqs, deps).create(faqInput);

    expect(result).toEqual({ ok: false, code: "unknown" });
    expect(JSON.stringify(result)).not.toContain("permission denied");
  });

  it("rejects a bad id before touching the database", async () => {
    const { deps, requests } = testDeps(() => OK_EMPTY);

    const result = await contentActions(CONTENT_REGISTRY.content_faqs, deps).create({
      ...faqInput,
      id: "FAQ Kafolat",
    });

    expect(result).toMatchObject({ ok: false, code: "validation", field: "id", details: ["slug"] });
    expect(requests).toEqual([]);
  });
});

describe("contentActions.update", () => {
  it("writes with the id + version filter and revalidates", async () => {
    const { deps, requests, revalidate } = testDeps(() => ({ status: 200, body: [{ id: "faq-kafolat" }] }));

    const result = await contentActions(CONTENT_REGISTRY.content_faqs, deps).save({ ...faqInput, version: 3 });

    expect(result).toEqual({ ok: true });
    expect(revalidate).toHaveBeenCalledWith("faqs");
    expect(requests).toHaveLength(1);
    const [patch] = requests;
    expect(patch?.method).toBe("PATCH");
    expect(patch?.url.searchParams.get("id")).toBe("eq.faq-kafolat");
    expect(patch?.url.searchParams.get("version")).toBe("eq.3");
    expect(patch?.body).toMatchObject({ status: "draft", updated_by: "manager@watertech.uz" });
  });

  it("reports version_conflict when someone else saved first", async () => {
    const { deps, revalidate } = testDeps(() => ({ status: 200, body: [] }));

    const result = await contentActions(CONTENT_REGISTRY.content_faqs, deps).save({ ...faqInput, version: 2 });

    expect(result).toEqual({ ok: false, code: "version_conflict", field: undefined, details: undefined });
    expect(revalidate).not.toHaveBeenCalled();
  });
});

describe("contentActions publish gate", () => {
  it("blocks a save that would publish, and writes nothing", async () => {
    const { deps, requests, revalidate, runGateOnCandidate } = testDeps(() => OK_EMPTY, { candidate: BLOCKED });

    const result = await contentActions(CONTENT_REGISTRY.content_faqs, deps).save({
      ...faqInput,
      status: "published",
      version: 1,
    });

    expect(result).toEqual({ ok: false, code: "gate_blocked", gate: BLOCKED });
    expect(runGateOnCandidate).toHaveBeenCalledTimes(1);
    expect(requests).toEqual([]);
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("does not run the gate when saving a draft", async () => {
    const { deps, runGateOnCandidate } = testDeps(() => ({ status: 200, body: [{ id: "faq-kafolat" }] }));

    await contentActions(CONTENT_REGISTRY.content_faqs, deps).save({ ...faqInput, version: 1 });

    expect(runGateOnCandidate).not.toHaveBeenCalled();
  });

  it("gates the stored row on publish and skips it on unpublish", async () => {
    const blocked = testDeps(() => OK_EMPTY, { stored: BLOCKED });
    const publish = await contentActions(CONTENT_REGISTRY.content_faqs, blocked.deps).setStatus(
      "faq-kafolat",
      "published",
      2
    );
    expect(publish).toEqual({ ok: false, code: "gate_blocked", gate: BLOCKED });
    expect(blocked.runGate).toHaveBeenCalledWith({
      table: "content_faqs",
      id: "faq-kafolat",
      actor: "manager@watertech.uz",
    });
    expect(blocked.requests).toEqual([]);

    const draft = testDeps(() => ({ status: 200, body: [{ id: "faq-kafolat" }] }));
    const unpublish = await contentActions(CONTENT_REGISTRY.content_faqs, draft.deps).setStatus(
      "faq-kafolat",
      "draft",
      2
    );
    expect(unpublish).toEqual({ ok: true });
    expect(draft.runGate).not.toHaveBeenCalled();
    expect(draft.requests[0]?.url.searchParams.get("version")).toBe("eq.2");
    expect(draft.requests[0]?.body).toEqual({ status: "draft", updated_by: "manager@watertech.uz" });
  });
});

describe("contentActions.remove", () => {
  it("deletes only the exact id + version, then revalidates", async () => {
    const { deps, requests, revalidate } = testDeps(() => ({ status: 200, body: [{ id: "faq-kafolat" }] }));

    const result = await contentActions(CONTENT_REGISTRY.content_faqs, deps).remove("faq-kafolat", 7);

    expect(result).toEqual({ ok: true });
    expect(revalidate).toHaveBeenCalledWith("faqs");
    const [del] = requests;
    expect(del?.method).toBe("DELETE");
    expect(del?.url.searchParams.get("id")).toBe("eq.faq-kafolat");
    expect(del?.url.searchParams.get("version")).toBe("eq.7");
  });

  it("reports version_conflict when the row is still there under another version", async () => {
    const { deps } = testDeps((request) =>
      isExistenceProbe(request) ? { status: 200, body: [{ id: "faq-kafolat" }] } : { status: 200, body: [] }
    );

    const result = await contentActions(CONTENT_REGISTRY.content_faqs, deps).remove("faq-kafolat", 7);

    expect(result).toEqual({ ok: false, code: "version_conflict" });
  });

  it("reports not_found when the row is already gone", async () => {
    const { deps } = testDeps(() => ({ status: 200, body: [] }));

    const result = await contentActions(CONTENT_REGISTRY.content_faqs, deps).remove("faq-kafolat", 7);

    expect(result).toEqual({ ok: false, code: "not_found" });
  });

  it("maps a foreign-key violation to reference_in_use", async () => {
    const { deps } = testDeps(() => pgError("23503", "violates foreign key constraint"));

    const result = await contentActions(CONTENT_REGISTRY.content_package_groups, deps).remove("grp-boshlangich", 1);

    expect(result).toEqual({ ok: false, code: "reference_in_use" });
  });
});

describe("contentActions authorisation and references", () => {
  it("refuses before any query when the caller is not a manager", async () => {
    const { deps, requests } = testDeps(() => OK_EMPTY);
    const guarded: ContentActionDeps = {
      ...deps,
      requireSession: async () => {
        throw new AdminActionError("unauthorized");
      },
    };

    const actions = contentActions(CONTENT_REGISTRY.content_faqs, guarded);
    expect(await actions.save(faqInput)).toMatchObject({ ok: false, code: "unauthorized" });
    expect(await actions.remove("faq-kafolat", 1)).toMatchObject({ ok: false, code: "unauthorized" });
    expect(await actions.setStatus("faq-kafolat", "published", 1)).toMatchObject({
      ok: false,
      code: "unauthorized",
    });
    expect(requests).toEqual([]);
  });

  it("refuses a script whose stage points at an objection that does not exist", async () => {
    const { deps, requests } = testDeps(() => ({ status: 200, body: [{ id: "obj-qimmat" }] }));

    const result = await contentActions(CONTENT_REGISTRY.content_scripts, deps).create({
      id: "scr-lead",
      name: "Lead orqali",
      cheatSheet: "…",
      status: "draft",
      stages: [
        { id: "stg-salom", label: "Salom", turns: [], objectionIds: ["obj-qimmat", "obj-yoq"] },
      ],
    });

    expect(result).toEqual({ ok: false, code: "validation", field: "stages", details: ["obj-yoq"] });
    expect(requests.every((request) => request.method === "GET")).toBe(true);
  });
});
