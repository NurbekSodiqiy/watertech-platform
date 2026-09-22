// Pure guard logic for `npm run seed:content`, kept out of seed-content.ts so
// it can be unit-tested without a Supabase client or a service-role key.
//
// This module and its caller read process.env directly. That is the one
// documented exception to CLAUDE.md §7 ("env only via lib/env.ts"): the seed is
// a developer CLI, not app runtime — it never ships in a bundle, it runs before
// lib/env.ts's eager client parse would even be meaningful, and SEED_TARGET /
// PROD_PROJECT_REFS exist solely to describe the machine running the command.

/** Supabase-hosted project URLs are `https://<ref>.supabase.<tld>`. */
const SUPABASE_HOSTS = [".supabase.co", ".supabase.in"];

/** Hosts a local Supabase stack listens on (`supabase start`). */
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]", "0.0.0.0"];

export type ProjectRef =
  /** A hosted project: `ref` is the subdomain, which PROD_PROJECT_REFS lists. */
  | { kind: "hosted"; ref: string }
  /** A local `supabase start` stack — no ref exists, and none can be prod. */
  | { kind: "local" }
  /** Anything else: a custom domain, a proxy, an unparseable value. */
  | { kind: "unknown"; host: string };

/** Which project a Supabase URL points at. Never throws: an unparseable URL is
 * `unknown`, which the guard refuses just like an unrecognised custom domain —
 * "I cannot prove this is not production" is a refusal, not a pass. */
export function parseProjectRef(url: string | undefined): ProjectRef {
  if (!url) return { kind: "unknown", host: "" };
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return { kind: "unknown", host: url };
  }
  if (LOCAL_HOSTS.includes(host)) return { kind: "local" };
  const suffix = SUPABASE_HOSTS.find((s) => host.endsWith(s));
  if (!suffix) return { kind: "unknown", host };
  const ref = host.slice(0, -suffix.length);
  // A bare "supabase.co" or a deeper "db.abc.supabase.co" is not a project ref.
  return ref !== "" && !ref.includes(".") ? { kind: "hosted", ref } : { kind: "unknown", host };
}

/** `PROD_PROJECT_REFS` as a set: comma-separated, whitespace tolerant, case
 * insensitive (project refs are lowercase, but an operator pasting one is not). */
export function parseProdRefs(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((ref) => ref.trim().toLowerCase())
      .filter((ref) => ref !== "")
  );
}

export interface SeedFlags {
  /** Report what would happen and write nothing. */
  dryRun: boolean;
  /** Overwrite existing rows instead of skipping them. */
  force: boolean;
}

/** Only the two documented flags are accepted — an unrecognised argument is a
 * typo (`--forse`, `--dry_run`), and silently ignoring it on a script that can
 * overwrite a knowledge base is exactly the wrong default. */
export function parseSeedFlags(argv: readonly string[]): SeedFlags {
  const flags: SeedFlags = { dryRun: false, force: false };
  for (const arg of argv) {
    if (arg === "--dry-run") flags.dryRun = true;
    else if (arg === "--force") flags.force = true;
    else throw new Error(`Unknown argument: ${arg}. Usage: npm run seed:content -- [--dry-run] [--force]`);
  }
  return flags;
}

export interface SeedEnv {
  SEED_TARGET?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  PROD_PROJECT_REFS?: string;
}

export type GuardResult =
  | { ok: true; project: ProjectRef }
  | { ok: false; reason: string };

/**
 * Whether this machine may be seeded. Both conditions must hold, and they are
 * independent on purpose: `SEED_TARGET=staging` is the operator saying what
 * they think they are pointed at, and the project ref check is the script
 * verifying it. Neither alone caught the accident this guard exists for —
 * re-running the seed against production, which resets every published contact
 * to draft and overwrites managers' edits with the shipped TS arrays.
 *
 * A dry run is checked too: it still connects with the service-role key and
 * reads live tables, and "safe to read production" is not a call this script
 * gets to make on its own.
 */
export function checkSeedTarget(env: SeedEnv): GuardResult {
  const target = env.SEED_TARGET?.trim().toLowerCase();
  if (target !== "staging") {
    return {
      ok: false,
      reason:
        `SEED_TARGET is ${env.SEED_TARGET === undefined ? "unset" : `"${env.SEED_TARGET}"`}, expected "staging". ` +
        `This script overwrites content tables; it refuses to run without an explicit target.`,
    };
  }

  const project = parseProjectRef(env.NEXT_PUBLIC_SUPABASE_URL);
  const prodRefs = parseProdRefs(env.PROD_PROJECT_REFS);

  if (project.kind === "unknown") {
    return {
      ok: false,
      reason:
        `Could not read a Supabase project ref from NEXT_PUBLIC_SUPABASE_URL${project.host ? ` (host "${project.host}")` : ""}. ` +
        `Expected https://<ref>.supabase.co or a local stack. Refusing: an unrecognised host cannot be proven not to be production.`,
    };
  }

  if (project.kind === "hosted" && prodRefs.has(project.ref)) {
    return {
      ok: false,
      reason: `Project "${project.ref}" is listed in PROD_PROJECT_REFS. Refusing to seed production.`,
    };
  }

  if (project.kind === "hosted" && prodRefs.size === 0) {
    return {
      ok: false,
      reason:
        `PROD_PROJECT_REFS is empty, so "${project.ref}" cannot be checked against it. ` +
        `Set PROD_PROJECT_REFS to the production project ref(s), comma-separated, before seeding a hosted project.`,
    };
  }

  return { ok: true, project };
}

/** One table's dry-run line: how many of the prepared rows are new, and how
 * many already exist (skipped, or overwritten under --force). */
export interface TablePlan {
  table: string;
  insert: number;
  existing: number;
}

export function formatPlan(plans: readonly TablePlan[], flags: SeedFlags): string {
  const verb = flags.dryRun ? "would" : "will";
  const existingVerb = flags.force ? "overwrite" : "skip";
  const lines = plans.map(
    ({ table, insert, existing }) =>
      `  ${table.padEnd(24)} ${verb} insert ${String(insert).padStart(3)}, ${verb} ${existingVerb} ${String(existing).padStart(3)}`
  );
  const totals = plans.reduce(
    (acc, plan) => ({ insert: acc.insert + plan.insert, existing: acc.existing + plan.existing }),
    { insert: 0, existing: 0 }
  );
  return [
    `Plan (${flags.force ? "--force: existing rows overwritten" : "insert-only: existing rows untouched"}):`,
    ...lines,
    `  ${"TOTAL".padEnd(24)} ${verb} insert ${String(totals.insert).padStart(3)}, ${verb} ${existingVerb} ${String(totals.existing).padStart(3)}`,
  ].join("\n");
}
