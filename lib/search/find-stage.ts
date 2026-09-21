import type { ContentBundle } from "@/lib/content/loader";

/** Kept apart from lib/search/index.ts on purpose: index.ts imports fuse.js, and
 * lib/search/refs.ts (client code on the home page) only needs this lookup. */
export function findStageFor(scripts: ContentBundle["scripts"], objectionId: string): { scriptId: string; stageId: string } | null {
  for (const script of scripts) {
    const stage = script.stages.find((s) => s.objectionIds.includes(objectionId));
    if (stage) return { scriptId: script.id, stageId: stage.id };
  }
  return null;
}
