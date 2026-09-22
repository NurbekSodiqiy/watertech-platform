import { describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { restoreContentVersion } from "@/lib/admin/actions/restore";
import { AdminActionError } from "@/lib/admin/errors";
import type { ContentActionDeps } from "@/lib/admin/actions/factory";
import type { DynamicTablesDatabase } from "@/lib/supabase/typed";
import type { GateResult, GateTarget } from "@/lib/agents/publish-gate/types";

// Same approach as factory.test.ts and concurrency.test.ts: the query builder
// is the real supabase-js one and only the network is mocked, so what gets
// asserted is the PostgREST request a restore actually sends — the columns in
// the patch (never `status`), the version filter, and the insert a
// restore-from-trash turns into.

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
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
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

function testDeps(respond: Responder, gate?: GateResult) {
  const { supabase, requests } = mockedClient(respond);
  const revalidate = vi.fn();
  const runGateOnCandidate = vi.fn(async (_args: { target: GateTarget; actor: string }) => gate ?? PASSED);
  const runGate = vi.fn(async () => PASSED);
  const deps: ContentActionDeps = {
    requireSession: async () => ({ email: "manager@watertech.uz" }),
    client: () => supabase,
    runGate,
    runGateOnCandidate,
    revalidate,
  };
  return { deps, requests, revalidate, runGateOnCandidate };
}

/** The snapshot of a published FAQ: content columns plus the bookkeeping the
 * trigger captured with them. */
const SNAPSHOT = {
  id: "faq-kafolat",
  category: "Kafolat",
  question: "Kafolat muddati qancha?",
  answer: "10 yil.",
  question_ru: null,
  answer_ru: null,
  status: "published",
  sort_order: 2,
  version: 4,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-02-01T00:00:00Z",
  updated_by: "someone@watertech.uz",
};

/** The row as it is now: same id, edited answer, and a draft. */
const LIVE_DRAFT = { ...SNAPSHOT, answer: "5 yil.", status: "draft", version: 9, sort_order: 7 };
const LIVE_PUBLISHED = { ...LIVE_DRAFT, status: "published" };

const isVersionRead = (request: RecordedRequest): boolean =>
  request.method === "GET" && request.url.pathname === "/rest/v1/content_versions";

const isRowRead = (request: RecordedRequest): boolean =>
  request.method === "GET" &&
  request.url.pathname === "/rest/v1/content_faqs" &&
  request.url.searchParams.get("select") === "*";

const isSortOrderProbe = (request: RecordedRequest): boolean =>
  request.method === "GET" && request.url.searchParams.get("select") === "sort_order";

interface Routes {
  /** The content_versions row the restore reads, or null for "no such snapshot". */
  version?: { id: number; op: string; snapshot: Record<string, unknown> } | null;
  /** The row as it is now, or null for a row that is gone. */
  live?: Record<string, unknown> | null;
  /** What the write (PATCH or POST) answers. */
  write?: MockResponse;
}

/** A responder for the common shape: one version row, one (or no) live row,
 * and 200 for the write. */
function routes({
  version = { id: 7, op: "update", snapshot: SNAPSHOT },
  live = LIVE_DRAFT,
  write = { status: 200, body: [{ id: "faq-kafolat" }] },
}: Routes): Responder {
  return (request) => {
    if (isVersionRead(request)) return { status: 200, body: version ? [version] : [] };
    if (isRowRead(request)) return { status: 200, body: live ? [live] : [] };
    if (isSortOrderProbe(request)) return { status: 200, body: [{ sort_order: 11 }] };
    return write;
  };
}

describe("restoreContentVersion onto a live row", () => {
  it("writes the snapshot's content columns and never its status", async () => {
    const { deps, requests, revalidate } = testDeps(routes({}));

    const result = await restoreContentVersion(
      { table: "content_faqs", versionId: 7, expectedVersion: 9 },
      deps
    );

    expect(result).toEqual({ ok: true });
    expect(revalidate).toHaveBeenCalledWith("faqs");

    const patch = requests.find((request) => request.method === "PATCH");
    expect(patch?.url.searchParams.get("id")).toBe("eq.faq-kafolat");
    expect(patch?.url.searchParams.get("version")).toBe("eq.9");
    expect(patch?.url.searchParams.get("select")).toBe("id");
    // Content only: `status` would republish the row behind the publish
    // gate's back, and the rest is the trigger's or the list's business.
    expect(patch?.body).toEqual({
      category: "Kafolat",
      question: "Kafolat muddati qancha?",
      answer: "10 yil.",
      question_ru: null,
      answer_ru: null,
      updated_by: "manager@watertech.uz",
    });
  });

  it("gates the merged candidate when the row is published, and writes nothing when blocked", async () => {
    const { deps, requests, revalidate, runGateOnCandidate } = testDeps(
      routes({ live: LIVE_PUBLISHED }),
      BLOCKED
    );

    const result = await restoreContentVersion(
      { table: "content_faqs", versionId: 7, expectedVersion: 9 },
      deps
    );

    expect(result).toEqual({ ok: false, code: "gate_blocked", gate: BLOCKED });
    expect(runGateOnCandidate).toHaveBeenCalledTimes(1);
    expect(runGateOnCandidate.mock.calls[0]?.[0]).toMatchObject({
      actor: "manager@watertech.uz",
      target: { table: "content_faqs", row: { id: "faq-kafolat", answer: "10 yil." } },
    });
    expect(requests.some((request) => request.method === "PATCH")).toBe(false);
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("does not gate a draft row", async () => {
    const { deps, runGateOnCandidate } = testDeps(routes({}));

    const result = await restoreContentVersion(
      { table: "content_faqs", versionId: 7, expectedVersion: 9 },
      deps
    );

    expect(result).toEqual({ ok: true });
    expect(runGateOnCandidate).not.toHaveBeenCalled();
  });

  it("reports version_conflict when the row moved on since the page loaded", async () => {
    const { deps, requests, revalidate } = testDeps(routes({}));

    const result = await restoreContentVersion(
      { table: "content_faqs", versionId: 7, expectedVersion: 8 },
      deps
    );

    expect(result).toEqual({ ok: false, code: "version_conflict" });
    expect(requests.some((request) => request.method === "PATCH")).toBe(false);
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("reports version_conflict when the write itself matches no row", async () => {
    // The row was edited between the read and the write: the version filter
    // matches nothing and `.select("id")` comes back empty.
    const { deps, revalidate } = testDeps(routes({ write: { status: 200, body: [] } }));

    const result = await restoreContentVersion(
      { table: "content_faqs", versionId: 7, expectedVersion: 9 },
      deps
    );

    expect(result).toMatchObject({ ok: false, code: "version_conflict" });
    expect(revalidate).not.toHaveBeenCalled();
  });
});

describe("restoreContentVersion with no live row", () => {
  it("reports not_found when the snapshot is an update", async () => {
    const { deps, requests } = testDeps(routes({ live: null }));

    const result = await restoreContentVersion(
      { table: "content_faqs", versionId: 7, expectedVersion: 9 },
      deps
    );

    expect(result).toEqual({ ok: false, code: "not_found" });
    expect(requests.every((request) => request.method === "GET")).toBe(true);
  });

  it("re-creates a deleted row as a draft, whatever the snapshot said", async () => {
    const { deps, requests, revalidate } = testDeps(
      routes({ version: { id: 7, op: "delete", snapshot: SNAPSHOT }, live: null, write: { status: 201, body: null } })
    );

    const result = await restoreContentVersion(
      { table: "content_faqs", versionId: 7, expectedVersion: null },
      deps
    );

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
      sort_order: 12,
      updated_by: "manager@watertech.uz",
    });
  });

  it("reports id_taken when the row exists again by the time the insert lands", async () => {
    const { deps } = testDeps((request) => {
      if (isVersionRead(request)) return { status: 200, body: [{ id: 7, op: "delete", snapshot: SNAPSHOT }] };
      if (isRowRead(request)) return { status: 200, body: [] };
      if (isSortOrderProbe(request)) return { status: 200, body: [{ sort_order: 1 }] };
      return { status: 409, body: { code: "23505", message: "duplicate key value", details: null, hint: null } };
    });

    const result = await restoreContentVersion(
      { table: "content_faqs", versionId: 7, expectedVersion: null },
      deps
    );

    expect(result).toEqual({ ok: false, code: "id_taken", field: "id" });
  });

  it("reports version_conflict when the row is back and the trash page did not know", async () => {
    const { deps, requests } = testDeps(
      routes({ version: { id: 7, op: "delete", snapshot: SNAPSHOT }, live: LIVE_DRAFT })
    );

    const result = await restoreContentVersion(
      { table: "content_faqs", versionId: 7, expectedVersion: null },
      deps
    );

    expect(result).toEqual({ ok: false, code: "version_conflict" });
    expect(requests.every((request) => request.method === "GET")).toBe(true);
  });
});

describe("restoreContentVersion guards", () => {
  it("reports not_found for a snapshot that is not there", async () => {
    const { deps } = testDeps(routes({ version: null }));

    const result = await restoreContentVersion(
      { table: "content_faqs", versionId: 7, expectedVersion: 9 },
      deps
    );

    expect(result).toEqual({ ok: false, code: "not_found" });
  });

  it("refuses a table outside the registry before touching the database", async () => {
    const { deps, requests } = testDeps(routes({}));

    const result = await restoreContentVersion(
      { table: "allowed_users", versionId: 7, expectedVersion: 1 },
      deps
    );

    expect(result).toEqual({ ok: false, code: "validation", field: "table" });
    expect(requests).toEqual([]);
  });

  it("refuses before any query when the caller is not a manager", async () => {
    const { deps, requests } = testDeps(routes({}));
    const guarded: ContentActionDeps = {
      ...deps,
      requireSession: async () => {
        throw new AdminActionError("unauthorized");
      },
    };

    const result = await restoreContentVersion(
      { table: "content_faqs", versionId: 7, expectedVersion: 9 },
      guarded
    );

    expect(result).toMatchObject({ ok: false, code: "unauthorized" });
    expect(requests).toEqual([]);
  });
});
