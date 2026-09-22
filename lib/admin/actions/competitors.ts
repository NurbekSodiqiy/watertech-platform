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

const competitors = actionsFor(CONTENT_REGISTRY.content_competitors);

export async function upsertCompetitor(input: unknown): Promise<ActionResult> {
  return competitors.save(input);
}

export async function deleteCompetitor(id: string, expectedVersion: number): Promise<ActionResult> {
  return competitors.remove(id, expectedVersion);
}

export async function setCompetitorStatus(id: string, status: StatusValue, expectedVersion: number): Promise<ActionResult> {
  return competitors.setStatus(id, status, expectedVersion);
}
