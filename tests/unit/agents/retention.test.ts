import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { rpc, runContentScan } = vi.hoisted(() => ({ rpc: vi.fn(), runContentScan: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc }) }));
vi.mock("@/lib/agents/stale-scan", () => ({ runContentScan }));
vi.mock("@/lib/env", () => ({ getCronEnv: () => ({ CRON_SECRET: "cron-secret-for-tests" }) }));

import { runRetention } from "@/lib/agents/retention";
import { GET } from "@/app/api/cron/content-scan/route";

const RESULT = {
  skipped: false,
  telemetry_events_deleted: 120,
  copilot_logs_redacted: 4,
  copilot_logs_deleted: 2,
  content_gate_reports_deleted: 0,
  admin_notifications_deleted: 1,
  content_versions_updates_deleted: 3,
  content_versions_deletes_deleted: 0,
};

function cronRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cron/content-scan", {
    headers: { authorization: "Bearer cron-secret-for-tests" },
  });
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  rpc.mockReset();
  runContentScan.mockReset();
  rpc.mockResolvedValue({ data: [RESULT], error: null });
  runContentScan.mockResolvedValue({ created: 2, skipped: 1 });
  consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  consoleError.mockRestore();
});

describe("runRetention", () => {
  it("asks the database to skip when its own pg_cron job runs the policy", async () => {
    expect(await runRetention()).toEqual(RESULT);
    expect(rpc).toHaveBeenCalledWith("run_retention", { p_skip_if_scheduled: true });
  });

  it("throws on an error or a missing row", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "permission denied for function run_retention", code: "42501" } });
    await expect(runRetention()).rejects.toThrow("run_retention: 42501");

    rpc.mockResolvedValueOnce({ data: [], error: null });
    await expect(runRetention()).rejects.toThrow("no result row");
  });
});

describe("GET /api/cron/content-scan", () => {
  it("runs the scan, then retention, and reports both", async () => {
    const response = await GET(cronRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ created: 2, skipped: 1, retention: RESULT });
    expect(runContentScan.mock.invocationCallOrder[0]).toBeLessThan(rpc.mock.invocationCallOrder[0]);
  });

  it("reports a retention failure as its own error, without the database message", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "relation cron.job does not exist", code: "42P01" } });
    const response = await GET(cronRequest());

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "retention_failed" });
    expect(runContentScan).toHaveBeenCalledOnce();
  });

  it("does not run retention when the scan fails", async () => {
    runContentScan.mockRejectedValueOnce(new Error("content_faqs: timeout"));
    const response = await GET(cronRequest());

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "scan_failed" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("still refuses a request without the bearer secret", async () => {
    const response = await GET(new NextRequest("http://localhost/api/cron/content-scan"));

    expect(response.status).toBe(401);
    expect(runContentScan).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});
