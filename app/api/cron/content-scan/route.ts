import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getServerEnv } from "@/lib/env";
import { runContentScan, type ContentScanResult } from "@/lib/agents/stale-scan";

export const runtime = "nodejs";
// Never prerendered or cached: a GET here is a side-effecting job trigger.
export const dynamic = "force-dynamic";

type CronResponse = ContentScanResult | { error: string };

/** Constant-time compare, so response timing leaks nothing about the secret. */
function isAuthorized(header: string | null, secret: string): boolean {
  if (header === null) return false;
  const received = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${secret}`);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/** Daily stale-content scan. Vercel Cron (vercel.json) calls it with
 * `Authorization: Bearer $CRON_SECRET`; any other scheduler must send the same
 * header. Not behind middleware: the matcher skips /api/. */
export async function GET(request: NextRequest): Promise<NextResponse<CronResponse>> {
  let secret: string;
  try {
    secret = getServerEnv().CRON_SECRET;
  } catch (error) {
    console.error("[api/cron/content-scan] server env invalid:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Server sozlanmagan" }, { status: 500 });
  }

  if (!isAuthorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  try {
    const result = await runContentScan();
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[api/cron/content-scan] scan failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Tekshiruv bajarilmadi" }, { status: 500 });
  }
}
