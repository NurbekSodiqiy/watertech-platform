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

const scripts = actionsFor(CONTENT_REGISTRY.content_scripts);

export async function upsertScript(input: unknown): Promise<ActionResult> {
  return scripts.save(input);
}

export async function deleteScript(
  id: string,
  expectedVersion: number,
  options?: RemoveOptions
): Promise<ActionResult> {
  return scripts.remove(id, expectedVersion, options);
}

export async function setScriptStatus(id: string, status: StatusValue, expectedVersion: number): Promise<ActionResult> {
  return scripts.setStatus(id, status, expectedVersion);
}
