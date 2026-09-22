"use server";
import "server-only";
import { CONTENT_REGISTRY } from "@/lib/admin/registry";
import { actionsFor } from "./deps";
import type { RemoveOptions } from "./factory";
import type { ActionResult } from "@/lib/admin/errors";
import type { StatusValue } from "./status";

// Thin Server Action surface over the shared factory (./factory.ts). The
// bodies these three used to carry — parse, gate, write, revalidate — are the
// same for every content table and live in one place now; what stays here is
// the export names the pages and the DataTable bind to, because a Server
// Action reference must be an exported async function.

const sops = actionsFor(CONTENT_REGISTRY.content_sops);

export async function upsertSop(input: unknown): Promise<ActionResult> {
  return sops.save(input);
}

export async function deleteSop(
  id: string,
  expectedVersion: number,
  options?: RemoveOptions
): Promise<ActionResult> {
  return sops.remove(id, expectedVersion, options);
}

export async function setSopStatus(id: string, status: StatusValue, expectedVersion: number): Promise<ActionResult> {
  return sops.setStatus(id, status, expectedVersion);
}
