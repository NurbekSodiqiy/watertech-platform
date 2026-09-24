import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSession } from "@/lib/auth/server-session";
import { rateLimit } from "@/lib/security/rate-limit";
import { telemetryBatchSchema } from "@/lib/telemetry/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CONTENT_LENGTH_BYTES = 16_384;

// Any unexpected throw (session read, rate limiter, Supabase client) becomes a
// generic 500 — the real error is logged server-side, never sent back.
export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (error) {
    console.error("[api/events] unexpected error:", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

async function handlePost(request: Request): Promise<NextResponse> {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Telemetry records operators and sales managers only (CLAUDE.md §9): an
  // admin's batch — the owner previewing the operator app — is accepted and
  // dropped unread, before the rate limiter, the body and the insert. 204, not
  // an error, so the client does not queue it for a retry. The client tracker
  // sends nothing for an admin in the first place; this is the server's own
  // refusal.
  if (session.role === "admin") {
    return new NextResponse(null, { status: 204 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_CONTENT_LENGTH_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }

  // In-memory limiter only, deliberately: telemetry is high-volume and cheap,
  // so a per-instance limit that resets on cold start is an acceptable
  // backstop, and a durable Postgres check (rate_limit_hit, as /api/copilot
  // uses for its paid Gemini calls) would add a DB round trip to every batch.
  const rl = rateLimit(`events:${session.email}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const parsed = telemetryBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid body", issues: parsed.error.issues.slice(0, 3).map((i) => i.path) },
      { status: 400 }
    );
  }
  const events = parsed.data;

  // Server determines user_email from the authenticated session — never
  // trust an email the client might send in the event payload itself.
  const rows = events.map((e) => ({
    user_email: session.email,
    session_id: e.sessionId,
    ts: new Date(e.ts).toISOString(),
    type: e.type,
    path: e.path,
    entity_type: e.entityType ?? null,
    entity_id: e.entityId ?? null,
    duration_ms: e.durationMs ?? null,
    meta: e.meta ?? null,
  }));

  // Admin client bypasses RLS here because RLS forbids operators inserting
  // rows for arbitrary emails — the server (not the client payload) sets
  // user_email above, so this is safe.
  const admin = createAdminClient();
  const { error } = await admin.from("telemetry_events").insert(rows);

  if (error) {
    console.error("[api/events] insert failed:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return NextResponse.json({ error: "insert failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, inserted: rows.length });
}
