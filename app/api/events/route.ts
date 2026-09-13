import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSession } from "@/lib/auth/server-session";
import type { TelemetryEvent } from "@/lib/telemetry/types";

export async function POST(request: Request) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let events: TelemetryEvent[];
  try {
    const body = await request.json();
    if (!Array.isArray(body)) throw new Error("expected an array");
    events = body;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (events.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0 });
  }

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
