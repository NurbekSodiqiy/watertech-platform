/** Wire format of the /api/copilot text stream, shared by the route (writer)
 * and hooks/useCopilot.ts (reader). The body is the answer as plain text,
 * then exactly one trailer: either `\n\n@@SOURCES@@<json>` on success or
 * `\n@@ERROR@@` when the upstream stream broke part-way through. */

import type { SearchResultType } from "@/lib/search/index";

export const SOURCES_MARKER = "@@SOURCES@@";
export const ERROR_MARKER = "@@ERROR@@";

export type CopilotSourceType = SearchResultType | "product";

export interface CopilotSource {
  /** The CONTEXT block number the model cites as `[n]`. */
  n: number;
  title: string;
  /** Locale-less in-app path, for `Link` from @/i18n/routing. */
  href: string;
  type: CopilotSourceType;
}

export interface ParsedStream {
  answer: string;
  sources: CopilotSource[];
  /** true once a trailer (either kind) has arrived. */
  complete: boolean;
  failed: boolean;
}

function isSource(value: unknown): value is CopilotSource {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.n === "number" && typeof v.title === "string" && typeof v.href === "string" && typeof v.type === "string";
}

/** Splits the raw text received so far into answer + trailer. While a chunk
 * boundary has only delivered the start of a marker (`…\n\n@@SOU`), that
 * partial marker is held back rather than flashed into the answer. */
export function parseCopilotStream(raw: string): ParsedStream {
  const errorAt = raw.indexOf(ERROR_MARKER);
  if (errorAt !== -1) {
    return { answer: raw.slice(0, errorAt).trimEnd(), sources: [], complete: true, failed: true };
  }

  const sourcesAt = raw.indexOf(SOURCES_MARKER);
  if (sourcesAt !== -1) {
    const json = raw.slice(sourcesAt + SOURCES_MARKER.length);
    let sources: CopilotSource[] = [];
    let complete = false;
    try {
      const parsed: unknown = JSON.parse(json);
      if (Array.isArray(parsed)) sources = parsed.filter(isSource);
      complete = true;
    } catch {
      // JSON still arriving
    }
    return { answer: raw.slice(0, sourcesAt).trimEnd(), sources, complete, failed: false };
  }

  let answer = raw;
  for (let len = Math.min(raw.length, SOURCES_MARKER.length - 1); len > 0; len--) {
    const tail = raw.slice(-len);
    if (SOURCES_MARKER.startsWith(tail) || ERROR_MARKER.startsWith(tail)) {
      answer = raw.slice(0, -len);
      break;
    }
  }
  return { answer: answer.trimEnd(), sources: [], complete: false, failed: false };
}

const CITATION = /\[(\d{1,2})\]/g;

/** Block numbers the answer actually cites, in first-cited order. */
export function citedNumbers(answer: string): number[] {
  const seen = new Set<number>();
  for (const match of answer.matchAll(CITATION)) seen.add(Number(match[1]));
  return Array.from(seen);
}

/** Plain text for the clipboard: no `[n]` badges, no markdown leftovers. */
export function answerForClipboard(answer: string): string {
  return stripMarkdown(answer)
    .replace(CITATION, "")
    .replace(/[ \t]+([.,;:!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** The prompt forbids markdown, but models slip — drop bold/italic markers
 * and heading hashes rather than rendering them literally. */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*|__/g, "")
    .replace(/^[ \t]*#{1,6}[ \t]*/gm, "");
}
