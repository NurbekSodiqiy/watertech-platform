import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSession } from "@/lib/auth/server-session";
import { rateLimit } from "@/lib/security/rate-limit";
import { telemetryBatchSchema } from "@/lib/telemetry/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CONTENT_LENGTH_BYTES = 16_384;

export async function POST(request: Request) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_CONTENT_LENGTH_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }

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
