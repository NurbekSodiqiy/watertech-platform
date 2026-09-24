import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ServerSession } from "@/lib/auth/server-session";

// The server half of "an admin session records nothing" (CLAUDE.md §9):
// /api/events answers an admin's batch with 204 and inserts nothing, right
// after the session check — before the rate limiter, the body and the
// service-role client. Operators and sales managers are recorded, each row
// under the email of the session that posted it.

const mocks = vi.hoisted(() => ({
  session: null as ServerSession | null,
  insert: vi.fn(async (rows: unknown[]) => ({ error: null, rows })),
  createAdminClient: vi.fn(),
  rateLimit: vi.fn(() => ({ ok: true, retryAfterSec: 0 })),
}));

vi.mock("@/lib/auth/server-session", () => ({ getServerSession: async () => mocks.session }));
vi.mock("@/lib/security/rate-limit", () => ({ rateLimit: mocks.rateLimit }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    mocks.createAdminClient();
    return { from: () => ({ insert: mocks.insert }) };
  },
}));

const { POST } = await import("@/app/api/events/route");

function batch(count = 2) {
  return Array.from({ length: count }, (_, i) => ({
    sessionId: "3f0c8f5e-4b1a-4c1e-9d2a-0a1b2c3d4e5f",
    ts: Date.now(),
    type: "page_enter",
    path: `/page-${i}`,
  }));
}

function post(body: unknown): Request {
  const text = JSON.stringify(body);
  return new Request("https://kb.example.com/api/events", {
    method: "POST",
    headers: { "content-type": "application/json", "content-length": String(text.length) },
    body: text,
  });
}

beforeEach(() => {
  mocks.session = null;
  vi.clearAllMocks();
});

describe("POST /api/events", () => {
  it("answers an admin's batch with 204 and records nothing — not even a rate-limit hit", async () => {
    mocks.session = { email: "owner@watertech.uz", role: "admin" };

    const res = await POST(post(batch()));

    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    expect(mocks.rateLimit).not.toHaveBeenCalled();
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("drops an admin's batch before reading it, malformed or not", async () => {
    mocks.session = { email: "owner@watertech.uz", role: "admin" };
    const res = await POST(post({ not: "a batch" }));
    expect(res.status).toBe(204);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("records an operator's and a sales manager's events under their own session email", async () => {
    for (const session of [
      { email: "op@watertech.uz", role: "operator" },
      { email: "sales@watertech.uz", role: "manager" },
    ] satisfies ServerSession[]) {
      mocks.insert.mockClear();
      mocks.session = session;

      const res = await POST(post(batch(2)));

      expect(res.status).toBe(200);
      expect(mocks.insert).toHaveBeenCalledTimes(1);
      const rows = mocks.insert.mock.calls[0]?.[0] ?? [];
      expect(rows).toHaveLength(2);
      expect(rows.every((row) => (row as { user_email: string }).user_email === session.email)).toBe(true);
    }
  });

  it("still refuses a request without a session with 401", async () => {
    const res = await POST(post(batch()));
    expect(res.status).toBe(401);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
