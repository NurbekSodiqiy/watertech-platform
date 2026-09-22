import { describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { contentActions, type ContentActionDeps } from "@/lib/admin/actions/factory";
import { CONTENT_REGISTRY, type AdminDbClient } from "@/lib/admin/registry";
import type { DynamicTablesDatabase } from "@/lib/supabase/typed";
import type { GateResult } from "@/lib/agents/publish-gate/types";

// The delete guard, both halves: what each registry entry's `referencedBy`
// finds (the ids in JSONB and in array columns that no foreign key enforces),
// and what the factory's remove() does with it — refuse outright for a
// reference that would dangle, ask once for one the database cascades.
//
// Real supabase-js query builder over a mocked fetch, like factory.test.ts:
// the PostgREST filter a guard sends is part of what is being tested.

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
  const supabase: AdminDbClient = createClient<DynamicTablesDatabase>(
    "https://example.supabase.co",
    "anon-key-anon-key-anon-key",
    { global: { fetch }, auth: { persistSession: false, autoRefreshToken: false } }
  );
  return { supabase, requests };
}

const PASSED: GateResult = { passed: true, issues: [] };

function testDeps(respond: Responder) {
  const { supabase, requests } = mockedClient(respond);
  const revalidate = vi.fn();
  const deps: ContentActionDeps = {
    requireSession: async () => ({ email: "manager@watertech.uz" }),
    client: () => supabase,
    runGate: async () => PASSED,
    runGateOnCandidate: async () => PASSED,
    revalidate,
  };
  return { deps, requests, revalidate };
}

function stage(id: string, objectionIds: string[]) {
  return { id, label: id, turns: [], objectionIds };
}

const SCRIPTS = [
  {
    id: "scr-lead",
    name: "Lead orqali tushgan",
    stages: [stage("stg-salom", []), stage("stg-etiroz", ["obj-qimmat"])],
    stages_ru: null,
  },
  {
    id: "scr-sovuq",
    name: "Sovuq qo'ng'iroq",
    stages: [stage("stg-salom", [])],
    // Only the Russian tree mentions it — a delete guard that reads one
    // locale would leave this script with a dangling id.
    stages_ru: [stage("stg-etiroz", ["obj-qimmat"])],
  },
  { id: "scr-tender", name: "Tender", stages: [stage("stg-salom", ["obj-boshqa"])], stages_ru: null },
];

describe("content_objections referencedBy", () => {
  it("names every script whose stage tree handles the objection, in either locale", async () => {
    const { supabase } = mockedClient(() => ({ status: 200, body: SCRIPTS }));

    const uses = await CONTENT_REGISTRY.content_objections.referencedBy?.("obj-qimmat", supabase);

    expect(uses).toEqual([
      { table: "content_scripts", mode: "block", titles: ["Lead orqali tushgan", "Sovuq qo'ng'iroq"], count: 2 },
    ]);
  });

  it("finds nothing for an objection no script uses", async () => {
    const { supabase } = mockedClient(() => ({ status: 200, body: SCRIPTS }));

    expect(await CONTENT_REGISTRY.content_objections.referencedBy?.("obj-yangi", supabase)).toEqual([]);
  });
});

describe("content_scripts referencedBy", () => {
  it("asks for the objections whose script_ids contain this script", async () => {
    const { supabase, requests } = mockedClient(() => ({
      status: 200,
      body: [
        { id: "obj-qimmat", label: "Narxi qimmat" },
        { id: "obj-oylab", label: "O'ylab ko'ramiz" },
      ],
    }));

    const uses = await CONTENT_REGISTRY.content_scripts.referencedBy?.("scr-lead", supabase);

    expect(uses).toEqual([
      { table: "content_objections", mode: "block", titles: ["Narxi qimmat", "O'ylab ko'ramiz"], count: 2 },
    ]);
    const [request] = requests;
    expect(request?.url.pathname).toBe("/rest/v1/content_objections");
    expect(request?.url.searchParams.get("script_ids")).toBe("cs.{scr-lead}");
    expect(request?.url.searchParams.get("select")).toBe("id,label");
  });
});

describe("content_package_groups referencedBy", () => {
  it("counts the group's packages as a cascade, not as a block", async () => {
    const { supabase, requests } = mockedClient(() => ({
      status: 200,
      body: [
        { id: "pkg-start", name: "Boshlang'ich" },
        { id: "pkg-pro", name: "Pro" },
      ],
    }));

    const uses = await CONTENT_REGISTRY.content_package_groups.referencedBy?.("grp-dealer", supabase);

    expect(uses).toEqual([
      { table: "content_packages", mode: "cascade", titles: ["Boshlang'ich", "Pro"], count: 2 },
    ]);
    expect(requests[0]?.url.searchParams.get("group_id")).toBe("eq.grp-dealer");
  });

  it("finds nothing for an empty group", async () => {
    const { supabase } = mockedClient(() => ({ status: 200, body: [] }));

    expect(await CONTENT_REGISTRY.content_package_groups.referencedBy?.("grp-bosh", supabase)).toEqual([]);
  });
});

describe("remove() with a blocking reference", () => {
  it("refuses the delete and names the rows that point at it", async () => {
    const { deps, requests, revalidate } = testDeps(() => ({ status: 200, body: SCRIPTS }));

    const result = await contentActions(CONTENT_REGISTRY.content_objections, deps).remove("obj-qimmat", 3);

    expect(result).toEqual({
      ok: false,
      code: "reference_in_use",
      details: ["Lead orqali tushgan", "Sovuq qo'ng'iroq"],
      references: [
        { table: "content_scripts", mode: "block", titles: ["Lead orqali tushgan", "Sovuq qo'ng'iroq"], count: 2 },
      ],
    });
    expect(requests.some((request) => request.method === "DELETE")).toBe(false);
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("deletes once nothing points at the row any more", async () => {
    const { deps, requests, revalidate } = testDeps((request) =>
      request.method === "DELETE"
        ? { status: 200, body: [{ id: "obj-qimmat" }] }
        : { status: 200, body: [SCRIPTS[2]] }
    );

    const result = await contentActions(CONTENT_REGISTRY.content_objections, deps).remove("obj-qimmat", 3);

    expect(result).toEqual({ ok: true });
    expect(revalidate).toHaveBeenCalledWith("objections");
    const del = requests.find((request) => request.method === "DELETE");
    expect(del?.url.searchParams.get("version")).toBe("eq.3");
  });
});

describe("remove() with a cascading reference", () => {
  const packages = [
    { id: "pkg-start", name: "Boshlang'ich" },
    { id: "pkg-pro", name: "Pro" },
  ];

  it("asks first, naming the packages the group would take with it", async () => {
    const { deps, requests } = testDeps(() => ({ status: 200, body: packages }));

    const result = await contentActions(CONTENT_REGISTRY.content_package_groups, deps).remove("grp-dealer", 2);

    expect(result).toMatchObject({
      ok: false,
      code: "reference_in_use",
      references: [{ mode: "cascade", count: 2, titles: ["Boshlang'ich", "Pro"] }],
    });
    expect(requests.some((request) => request.method === "DELETE")).toBe(false);
  });

  it("deletes when the manager confirms the cascade", async () => {
    const { deps, requests, revalidate } = testDeps((request) =>
      request.method === "DELETE"
        ? { status: 200, body: [{ id: "grp-dealer" }] }
        : { status: 200, body: packages }
    );

    const result = await contentActions(CONTENT_REGISTRY.content_package_groups, deps).remove("grp-dealer", 2, {
      confirmCascade: true,
    });

    expect(result).toEqual({ ok: true });
    expect(revalidate).toHaveBeenCalledWith("packages");
    const del = requests.find((request) => request.method === "DELETE");
    expect(del?.url.searchParams.get("id")).toBe("eq.grp-dealer");
    expect(del?.url.searchParams.get("version")).toBe("eq.2");
  });

  it("never lets a confirmation through for a blocking reference", async () => {
    const { deps, requests } = testDeps(() => ({ status: 200, body: SCRIPTS }));

    const result = await contentActions(CONTENT_REGISTRY.content_objections, deps).remove("obj-qimmat", 3, {
      confirmCascade: true,
    });

    expect(result).toMatchObject({ ok: false, code: "reference_in_use" });
    expect(requests.some((request) => request.method === "DELETE")).toBe(false);
  });
});
