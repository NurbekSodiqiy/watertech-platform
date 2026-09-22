import "server-only";
import { createClient } from "@/lib/supabase/server";
import { runPublishGate, runPublishGateOnCandidate } from "@/lib/agents/publish-gate";
import { revalidateContent } from "@/lib/content/revalidate";
import type { DynamicTablesDatabase } from "@/lib/supabase/typed";
import type { ContentColumn, ContentEntry, ContentWrite } from "@/lib/admin/registry";
import type { DashboardTableName } from "@/lib/dashboard/content-health";
import { contentActions, type ContentActionDeps, type ContentActions } from "./factory";
import { requireManagerSession } from "./guard";

// What the action factory talks to in a real request. Kept out of factory.ts
// so a unit test can import the factory without pulling in next/headers, the
// publish gate and the Supabase clients behind them.

export const liveDeps: ContentActionDeps = {
  requireSession: requireManagerSession,
  // Session client under RLS, per CLAUDE.md §7: a content write is the
  // manager's own write and must be refused by the database, not just by this
  // code, when it isn't. The service-role client is never used here.
  client: () => createClient<DynamicTablesDatabase>(),
  runGate: runPublishGate,
  runGateOnCandidate: runPublishGateOnCandidate,
  revalidate: revalidateContent,
};

/** `contentActions` bound to the live request dependencies — what every
 * "use server" wrapper in this folder builds its exports from. */
export function actionsFor<
  T extends DashboardTableName,
  TWrite extends ContentWrite,
  TColumns extends readonly ContentColumn<T>[],
>(entry: ContentEntry<T, TWrite, TColumns>): ContentActions {
  return contentActions(entry, liveDeps);
}
