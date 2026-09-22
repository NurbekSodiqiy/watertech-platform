"use server";
import "server-only";
import { CONTENT_REGISTRY } from "@/lib/admin/registry";
import { actionsFor } from "./deps";
import type { ActionResult } from "@/lib/admin/errors";
import type { StatusValue } from "./status";

// Thin Server Action surface over the shared factory (./factory.ts). The
// bodies these three used to carry — parse, gate, write, revalidate — are the
// same for every content table and live in one place now; what stays here is
// the export names the pages and the DataTable bind to, because a Server
// Action reference must be an exported async function.

const changelog = actionsFor(CONTENT_REGISTRY.content_changelog);

export async function upsertChangelog(input: unknown): Promise<ActionResult> {
  return changelog.save(input);
}

export async function deleteChangelog(id: string, expectedVersion: number): Promise<ActionResult> {
  return changelog.remove(id, expectedVersion);
}

export async function setChangelogStatus(id: string, status: StatusValue, expectedVersion: number): Promise<ActionResult> {
  return changelog.setStatus(id, status, expectedVersion);
}
