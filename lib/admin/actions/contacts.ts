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

const contacts = actionsFor(CONTENT_REGISTRY.content_contacts);

export async function upsertContact(input: unknown): Promise<ActionResult> {
  return contacts.save(input);
}

export async function deleteContact(
  id: string,
  expectedVersion: number,
  options?: RemoveOptions
): Promise<ActionResult> {
  return contacts.remove(id, expectedVersion, options);
}

export async function setContactStatus(id: string, status: StatusValue, expectedVersion: number): Promise<ActionResult> {
  return contacts.setStatus(id, status, expectedVersion);
}
