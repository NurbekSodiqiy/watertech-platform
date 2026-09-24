import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server-session";
import { getCopilotEnv } from "@/lib/env";
import { rateLimit } from "@/lib/security/rate-limit";
import { durableRateLimitHit } from "@/lib/security/durable-rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { copilotRequestSchema } from "@/lib/copilot/schema";
import { retrieve } from "@/lib/copilot/retrieve";
import { buildSystemInstruction, buildUserMessage, notInKnowledgeBase } from "@/lib/copilot/prompt";
import { CopilotUpstreamError, streamAnswer, type StreamDone } from "@/lib/copilot/gemini";
import { ERROR_MARKER, SOURCES_MARKER, type CopilotSource } from "@/lib/copilot/protocol";
import type { CopilotChunk } from "@/lib/copilot/docs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 8_192;

// Our own limits, well under Gemini's quota: the app should refuse before
// Google does, and per operator rather than for everyone at once. Both are
// enforced durably in Postgres (rate_limit_hit, migration 0008) because the
// in-memory limiter is per serverless instance; the per-minute one is also
// checked in memory first so a burst on one warm instance never reaches the DB.
const COPILOT_PER_MINUTE_LIMIT = 20;
const COPILOT_DAILY_LIMIT = 200;

const STREAM_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Accel-Buffering": "no",
};

type LogStatus = "ok" | "no_hits" | "error" | "rate_limited";

interface LogEntry {
  email: string;
  locale: string | null;
  question: string | null;
  hitIds: string[];
  answerChars: number;
  startedAt: number;
  model: string | null;
  finishReason: string | null;
  status: LogStatus;
}

// Fire-and-forget: a logging failure must never fail or delay an answer.
// Admin client because copilot_logs has no insert policy at all — rows are
// written only by this server route, with the email taken from the verified
// session, never from the request body.
function logCopilot(entry: LogEntry): void {
  try {
    void createAdminClient()
      .from("copilot_logs")
      .insert({
        email: entry.email,
        locale: entry.locale,
        question: entry.question,
        hit_ids: entry.hitIds,
        answer_chars: entry.answerChars,
        latency_ms: Date.now() - entry.startedAt,
        model: entry.model,
        finish_reason: entry.finishReason,
        status: entry.status,
      })
      .then(({ error }) => {
        if (error) console.error("[api/copilot] log insert failed:", error.message);
      });
  } catch (error) {
    console.error("[api/copilot] log insert failed:", error);
  }
}

/** Seconds until an epoch-aligned window ends — rate_limit_hit() aligns its
 * windows the same way, so this is when the counter actually resets. */
function secondsUntilWindowEnds(windowSeconds: number): number {
  return windowSeconds - (Math.floor(Date.now() / 1000) % windowSeconds);
}

function toSources(chunks: CopilotChunk[]): CopilotSource[] {
  return chunks.map((chunk, i) => ({ n: i + 1, title: chunk.title, href: chunk.href, type: chunk.type }));
}

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (error) {
    console.error("[api/copilot] unexpected error:", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

async function handlePost(request: Request): Promise<Response> {
  const startedAt = Date.now();

  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { GEMINI_API_KEY: apiKey, COPILOT_MODEL: model } = getCopilotEnv();
  if (!apiKey) {
    return NextResponse.json({ error: "copilot_disabled" }, { status: 503 });
  }

  // Role: every allow-list role (operator, manager, admin) may ask the copilot
  // — getServerSession() has already rejected any session without one.

  const rl = rateLimit(`copilot:${session.email}`, { limit: COPILOT_PER_MINUTE_LIMIT, windowMs: 60_000 });
  if (!rl.ok) {
    logCopilot({
      email: session.email, locale: null, question: null, hitIds: [], answerChars: 0,
      startedAt, model, finishReason: null, status: "rate_limited",
    });
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }
  // Content-Length can be absent (chunked upload), so the real size is
  // checked again once read.
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const parsed = copilotRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { question, locale, history } = parsed.data;

  // Durable check after validation, so a malformed request never costs a DB
  // round trip or a unit of the operator's daily quota. Fails closed: if the
  // limit can't be checked, no paid Gemini call is made.
  let perMinute: boolean;
  let perDay: boolean;
  try {
    [perMinute, perDay] = await Promise.all([
      durableRateLimitHit(`copilot:minute:${session.email}`, { limit: COPILOT_PER_MINUTE_LIMIT, windowSeconds: 60 }),
      durableRateLimitHit(`copilot:day:${session.email}`, { limit: COPILOT_DAILY_LIMIT, windowSeconds: 86_400 }),
    ]);
  } catch (error) {
    console.error("[api/copilot] durable rate limit check failed:", error);
    return NextResponse.json({ error: "rate_limit_unavailable" }, { status: 503 });
  }
  if (!perMinute || !perDay) {
    logCopilot({
      email: session.email, locale, question: null, hitIds: [], answerChars: 0,
      startedAt, model, finishReason: null, status: "rate_limited",
    });
    const retryAfterSec = perDay ? secondsUntilWindowEnds(60) : secondsUntilWindowEnds(86_400);
    return NextResponse.json(
      { error: perDay ? "rate_limited" : "daily_limit_reached" },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  const chunks = await retrieve(question, locale);
  const hitIds = chunks.map((chunk) => chunk.id);
  const baseLog = { email: session.email, locale, question, hitIds, startedAt, model };

  // Nothing to ground an answer in: the refusal sentence is deterministic, so
  // it's sent without a model call at all.
  if (chunks.length === 0) {
    const text = notInKnowledgeBase(locale);
    logCopilot({ ...baseLog, answerChars: text.length, finishReason: null, status: "no_hits" });
    return new Response(`${text}\n\n${SOURCES_MARKER}[]`, { headers: STREAM_HEADERS });
  }

  // Aborted when the operator closes the panel (request.signal) or the
  // response stream is cancelled, so Gemini stops generating too.
  const upstreamAbort = new AbortController();
  request.signal.addEventListener("abort", () => upstreamAbort.abort(), { once: true });

  const answer = streamAnswer({
    apiKey,
    model,
    system: buildSystemInstruction(locale),
    history,
    user: buildUserMessage(question, chunks),
    signal: upstreamAbort.signal,
  });

  // Pull the first item before committing to a 200: an upstream failure that
  // happens before any text can still be reported as a proper JSON status.
  let first: IteratorResult<string | StreamDone>;
  try {
    first = await answer.next();
  } catch (error) {
    const rateLimited = error instanceof CopilotUpstreamError && error.reason === "rate_limited";
    console.error("[api/copilot] upstream failed before streaming:", error);
    logCopilot({ ...baseLog, answerChars: 0, finishReason: null, status: rateLimited ? "rate_limited" : "error" });
    return rateLimited
      ? NextResponse.json({ error: "upstream_rate_limited" }, { status: 503 })
      : NextResponse.json({ error: "upstream" }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const sources = toSources(chunks);

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let answerChars = 0;
      let finishReason: string | null = null;
      let failed = false;

      try {
        let item = first;
        while (!item.done) {
          const value = item.value;
          if (typeof value === "string") {
            answerChars += value.length;
            controller.enqueue(encoder.encode(value));
          } else {
            finishReason = value.finishReason;
          }
          item = await answer.next();
        }
      } catch (error) {
        failed = true;
        if (!upstreamAbort.signal.aborted) console.error("[api/copilot] upstream failed mid-stream:", error);
      }

      if (finishReason && finishReason !== "STOP") {
        console.warn("[api/copilot] answer ended with finish_reason", finishReason);
      }

      if (upstreamAbort.signal.aborted) {
        logCopilot({ ...baseLog, answerChars, finishReason, status: "error" });
        try {
          controller.close();
        } catch {
          // already cancelled by the client
        }
        return;
      }

      // An empty answer (e.g. a SAFETY block) is reported as a failure rather
      // than a blank bubble with source chips.
      const ok = !failed && answerChars > 0;
      controller.enqueue(
        encoder.encode(ok ? `\n\n${SOURCES_MARKER}${JSON.stringify(sources)}` : `\n${ERROR_MARKER}`)
      );
      logCopilot({ ...baseLog, answerChars, finishReason, status: ok ? "ok" : "error" });
      controller.close();
    },
    cancel() {
      upstreamAbort.abort();
    },
  });

  return new Response(body, { headers: STREAM_HEADERS });
}
