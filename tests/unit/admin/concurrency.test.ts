import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { VersionConflictError, updateWithVersion } from "@/lib/admin/actions/concurrency";
import { VERSION_CONFLICT_MESSAGE } from "@/lib/admin/version-conflict";
import type { DynamicTablesDatabase } from "@/lib/supabase/typed";

// The query builder is the real supabase-js one; only the network is mocked.
// That keeps the test type-safe (no cast to SupabaseClient) and also pins the
// PostgREST request the builder chain turns into: the version filter is the
// whole point of optimistic concurrency, so it's asserted, not assumed.

interface RecordedRequest {
  method: string;
  url: URL;
  body: unknown;
}

function mockedClient(status: number, responseBody: unknown) {
  const requests: RecordedRequest[] = [];
  const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const rawBody = typeof init?.body === "string" ? init.body : null;
    requests.push({ method: init?.method ?? "GET", url, body: rawBody === null ? null : JSON.parse(rawBody) });
    return new Response(JSON.stringify(responseBody), { status, headers: { "Content-Type": "application/json" } });
  };
  const supabase = createClient<DynamicTablesDatabase>("https://example.supabase.co", "anon-key-anon-key-anon-key", {
    global: { fetch },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { supabase, requests };
}

describe("updateWithVersion", () => {
  it("resolves when exactly one row matched id + expected version", async () => {
    const { supabase, requests } = mockedClient(200, [{ id: "faq-kafolat" }]);

    await expect(
      updateWithVersion(supabase, "content_faqs", "faq-kafolat", { answer: "Yangi javob" }, 3)
    ).resolves.toBeUndefined();

    expect(requests).toHaveLength(1);
    const [request] = requests;
    expect(request?.method).toBe("PATCH");
    expect(request?.url.pathname).toBe("/rest/v1/content_faqs");
    expect(request?.url.searchParams.get("id")).toBe("eq.faq-kafolat");
    expect(request?.url.searchParams.get("version")).toBe("eq.3");
    expect(request?.url.searchParams.get("select")).toBe("id");
    expect(request?.body).toEqual({ answer: "Yangi javob" });
  });

  it("throws VersionConflictError when zero rows matched (someone saved first)", async () => {
    const { supabase } = mockedClient(200, []);

    const update = updateWithVersion(supabase, "content_faqs", "faq-kafolat", { answer: "Eskirgan javob" }, 2);
    await expect(update).rejects.toBeInstanceOf(VersionConflictError);
    await expect(update).rejects.toThrow(VERSION_CONFLICT_MESSAGE);
  });

  it("rethrows a database error as a plain Error, not a version conflict", async () => {
    const { supabase } = mockedClient(403, {
      code: "42501",
      message: "permission denied for table content_faqs",
      details: null,
      hint: null,
    });

    const update = updateWithVersion(supabase, "content_faqs", "faq-kafolat", { answer: "x" }, 1);
    await expect(update).rejects.toThrow("permission denied for table content_faqs");
    await expect(update).rejects.not.toBeInstanceOf(VersionConflictError);
  });
});
