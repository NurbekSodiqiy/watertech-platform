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

const faq = actionsFor(CONTENT_REGISTRY.content_faqs);

export async function upsertFaq(input: unknown): Promise<ActionResult> {
  return faq.save(input);
}

export async function deleteFaq(id: string, expectedVersion: number): Promise<ActionResult> {
  return faq.remove(id, expectedVersion);
}

export async function setFaqStatus(id: string, status: StatusValue, expectedVersion: number): Promise<ActionResult> {
  return faq.setStatus(id, status, expectedVersion);
}
