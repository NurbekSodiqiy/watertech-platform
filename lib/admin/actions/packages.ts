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

const packageGroups = actionsFor(CONTENT_REGISTRY.content_package_groups);

export async function upsertPackageGroup(input: unknown): Promise<ActionResult> {
  return packageGroups.save(input);
}

export async function deletePackageGroup(
  id: string,
  expectedVersion: number,
  options?: RemoveOptions
): Promise<ActionResult> {
  return packageGroups.remove(id, expectedVersion, options);
}

export async function setPackageGroupStatus(id: string, status: StatusValue, expectedVersion: number): Promise<ActionResult> {
  return packageGroups.setStatus(id, status, expectedVersion);
}

const packages = actionsFor(CONTENT_REGISTRY.content_packages);

export async function upsertPackage(input: unknown): Promise<ActionResult> {
  return packages.save(input);
}

export async function deletePackage(
  id: string,
  expectedVersion: number,
  options?: RemoveOptions
): Promise<ActionResult> {
  return packages.remove(id, expectedVersion, options);
}

export async function setPackageStatus(id: string, status: StatusValue, expectedVersion: number): Promise<ActionResult> {
  return packages.setStatus(id, status, expectedVersion);
}
