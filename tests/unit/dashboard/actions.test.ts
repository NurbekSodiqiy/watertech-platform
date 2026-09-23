import { beforeEach, describe, expect, it, vi } from "vitest";

// The dashboard's quick actions (lib/dashboard/actions.ts) are Server Actions:
// a public endpoint whose arguments come from the browser. They must refuse a
// malformed row reference the way factory.setStatus does — before the publish
// gate runs, since a gate run on a bogus id still writes a gate report and a
// "publish blocked" notification naming it.

const mocks = vi.hoisted(() => ({
  requireManagerSession: vi.fn(async () => ({ email: "boss@watertech.uz" })),
  runPublishGate: vi.fn(async () => ({ passed: true, issues: [] })),
  updateWithVersion: vi.fn(async () => undefined),
  revalidateContent: vi.fn(),
  revalidatePath: vi.fn(),
  client: {},
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath, unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/supabase/server", () => ({ createClient: () => mocks.client }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(), createDynamicAdminClient: vi.fn() }));
vi.mock("@/lib/admin/actions/guard", () => ({ requireManagerSession: mocks.requireManagerSession }));
vi.mock("@/lib/agents/publish-gate", () => ({ runPublishGate: mocks.runPublishGate }));
vi.mock("@/lib/admin/actions/concurrency", () => ({ updateWithVersion: mocks.updateWithVersion }));
vi.mock("@/lib/content/revalidate", () => ({ revalidateContent: mocks.revalidateContent }));

import { publishFromDashboard, touchContent, unpublishFromDashboard } from "@/lib/dashboard/actions";

beforeEach(() => {
  vi.clearAllMocks();
});

// Every case is something a browser can send to a Server Action but no row can
// have: a path-like or empty id, and versions that are not a stored integer.
const MALFORMED: { name: string; id: unknown; expectedVersion: unknown; field: string }[] = [
  { name: "a path-like id", id: "../../admin/users", expectedVersion: 3, field: "id" },
  { name: "an empty id", id: "", expectedVersion: 3, field: "id" },
  { name: "an object as the id", id: { toString: () => "faq-1" }, expectedVersion: 3, field: "id" },
  { name: "a fractional version", id: "faq-1", expectedVersion: 1.5, field: "expectedVersion" },
  { name: "a negative version", id: "faq-1", expectedVersion: -1, field: "expectedVersion" },
  { name: "a numeric string as the version", id: "faq-1", expectedVersion: "3", field: "expectedVersion" },
  { name: "NaN as the version", id: "faq-1", expectedVersion: Number.NaN, field: "expectedVersion" },
];

const ACTIONS = [
  { name: "publishFromDashboard", run: publishFromDashboard },
  { name: "unpublishFromDashboard", run: unpublishFromDashboard },
  { name: "touchContent", run: touchContent },
] as const;

describe("dashboard quick actions validate their row reference", () => {
  for (const action of ACTIONS) {
    for (const input of MALFORMED) {
      it(`${action.name} refuses ${input.name} without gating or writing`, async () => {
        // The browser can send any JSON value; the TS signature is not a check.
        const result = await action.run("content_faqs", input.id as string, input.expectedVersion as number);

        expect(result).toMatchObject({ ok: false, code: "validation", field: input.field });
        expect(mocks.runPublishGate).not.toHaveBeenCalled();
        expect(mocks.updateWithVersion).not.toHaveBeenCalled();
        expect(mocks.revalidateContent).not.toHaveBeenCalled();
      });
    }

    it(`${action.name} refuses a table outside the registry`, async () => {
      const result = await action.run("allowed_users", "faq-1", 3);
      expect(result).toEqual({ ok: false, code: "validation", field: "table" });
      expect(mocks.updateWithVersion).not.toHaveBeenCalled();
    });
  }

  it("publishFromDashboard gates, then writes the version-guarded status and revalidates", async () => {
    const result = await publishFromDashboard("content_faqs", "faq-1", 3);

    expect(result).toEqual({ ok: true });
    expect(mocks.runPublishGate).toHaveBeenCalledWith({ table: "content_faqs", id: "faq-1", actor: "boss@watertech.uz" });
    expect(mocks.updateWithVersion).toHaveBeenCalledWith(
      mocks.client,
      "content_faqs",
      "faq-1",
      { status: "published", updated_by: "boss@watertech.uz" },
      3
    );
    expect(mocks.revalidateContent).toHaveBeenCalledWith("faqs");
  });

  it("publishFromDashboard writes nothing when the gate blocks", async () => {
    const blocked = { passed: false, issues: [{ code: "row_not_found", severity: "error", message: "x" }] };
    mocks.runPublishGate.mockResolvedValueOnce(blocked as never);

    const result = await publishFromDashboard("content_faqs", "faq-1", 3);

    expect(result).toMatchObject({ ok: false, code: "gate_blocked" });
    expect(mocks.updateWithVersion).not.toHaveBeenCalled();
    expect(mocks.revalidateContent).not.toHaveBeenCalled();
  });

  it("unpublishFromDashboard and touchContent write without the gate", async () => {
    expect(await unpublishFromDashboard("content_sops", "sop-1", 0)).toEqual({ ok: true });
    expect(await touchContent("content_sops", "sop-1", 1)).toEqual({ ok: true });

    expect(mocks.runPublishGate).not.toHaveBeenCalled();
    expect(mocks.updateWithVersion).toHaveBeenNthCalledWith(
      1,
      mocks.client,
      "content_sops",
      "sop-1",
      { status: "draft", updated_by: "boss@watertech.uz" },
      0
    );
    expect(mocks.updateWithVersion).toHaveBeenNthCalledWith(
      2,
      mocks.client,
      "content_sops",
      "sop-1",
      { updated_by: "boss@watertech.uz" },
      1
    );
    expect(mocks.revalidateContent).toHaveBeenCalledWith("sops");
  });
});
