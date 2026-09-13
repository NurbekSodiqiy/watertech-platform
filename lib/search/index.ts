import Fuse from "fuse.js";
import { scripts } from "@/lib/content/scripts";
import { objections } from "@/lib/content/objections";
import { faqs } from "@/lib/content/faq";
import { competitors } from "@/lib/content/competitors";
import { packageGroups } from "@/lib/content/packages";
import { normalizeSearchText } from "@/lib/search/normalize";

export type SearchResultType = "objection" | "script_stage" | "faq" | "competitor" | "package";

/** Where a result should take the operator. Kept separate from display
 * fields so CommandPalette (which can navigate anywhere) and Call Mode's
 * inline search (which can only act on objections/stages of the script
 * already open, see searchCallMode below) can each decide what to do with
 * it without re-deriving this lookup themselves. */
export type SearchNav =
  | { kind: "script_stage"; scriptId: string; stageId: string }
  | { kind: "objection"; objectionId: string; scriptId: string; stageId: string }
  | { kind: "faq" }
  | { kind: "package" }
  | { kind: "competitor"; competitorId: string };

export interface SearchDoc {
  id: string;
  type: SearchResultType;
  title: string;
  snippet: string;
  nav: SearchNav;
  // Normalized-for-matching copies of the fields above (plus keywords, for
  // objections) — never shown, only searched. Weighted so a hit in
  // `keywords` (an objection's operator-facing search terms) ranks above a
  // hit in `title`, which ranks above a hit buried in `body` prose.
  keywords: string;
  searchTitle: string;
  body: string;
}

function findStageFor(objectionId: string): { scriptId: string; stageId: string } | null {
  for (const script of scripts) {
    const stage = script.stages.find((s) => s.objectionIds.includes(objectionId));
    if (stage) return { scriptId: script.id, stageId: stage.id };
  }
  return null;
}

function buildDocs(): SearchDoc[] {
  const docs: SearchDoc[] = [];

  for (const objection of objections) {
    const stageRef = findStageFor(objection.id);
    if (!stageRef) continue; // no script currently surfaces it — nothing to navigate to
    docs.push({
      id: `objection:${objection.id}`,
      type: "objection",
      title: objection.label,
      snippet: objection.response,
      nav: { kind: "objection", objectionId: objection.id, ...stageRef },
      keywords: normalizeSearchText(objection.keywords.join(" ")),
      searchTitle: normalizeSearchText(objection.label),
      body: normalizeSearchText(
        [objection.clientSays, objection.realMeaning, objection.response, objection.followUp ?? ""].join(" ")
      ),
    });
  }

  for (const script of scripts) {
    for (const stage of script.stages) {
      if (stage.turns.length === 0) continue; // e.g. "E'tiroz ustida ishlash" — content lives in the objection docs above
      docs.push({
        id: `stage:${script.id}:${stage.id}`,
        type: "script_stage",
        title: stage.label,
        snippet: script.name,
        nav: { kind: "script_stage", scriptId: script.id, stageId: stage.id },
        keywords: "",
        searchTitle: normalizeSearchText(stage.label),
        body: normalizeSearchText(
          stage.turns.map((t) => [t.subStepHeader ?? "", t.condition ?? "", t.text].join(" ")).join(" ")
        ),
      });
    }
  }

  for (const faq of faqs) {
    docs.push({
      id: `faq:${faq.id}`,
      type: "faq",
      title: faq.question,
      snippet: faq.answer,
      nav: { kind: "faq" },
      keywords: "",
      searchTitle: normalizeSearchText(faq.question),
      body: normalizeSearchText(faq.answer),
    });
  }

  for (const competitor of competitors) {
    docs.push({
      id: `competitor:${competitor.id}`,
      type: "competitor",
      title: competitor.name,
      snippet: competitor.assortment,
      nav: { kind: "competitor", competitorId: competitor.id },
      keywords: "",
      searchTitle: normalizeSearchText(competitor.name),
      body: normalizeSearchText(
        [competitor.assortment, competitor.marketingOffers, competitor.dealerCoverage].join(" ")
      ),
    });
  }

  for (const group of packageGroups) {
    for (const pkg of group.packages) {
      docs.push({
        id: `package:${pkg.id}`,
        type: "package",
        title: pkg.name,
        snippet: pkg.orderVolume,
        nav: { kind: "package" },
        keywords: "",
        searchTitle: normalizeSearchText(pkg.name),
        body: normalizeSearchText([pkg.orderVolume, pkg.paymentTerms, pkg.estimatedDiscount].join(" ")),
      });
    }
  }

  return docs;
}

let cache: { docs: SearchDoc[]; fuse: Fuse<SearchDoc> } | null = null;

function getIndex(): { docs: SearchDoc[]; fuse: Fuse<SearchDoc> } {
  if (!cache) {
    const docs = buildDocs();
    const fuse = new Fuse(docs, {
      keys: [
        { name: "keywords", weight: 0.5 },
        { name: "searchTitle", weight: 0.3 },
        { name: "body", weight: 0.2 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
    });
    cache = { docs, fuse };
  }
  return cache;
}

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  snippet: string;
  nav: SearchNav;
}

function toResult(doc: SearchDoc): SearchResult {
  return { id: doc.id, type: doc.type, title: doc.title, snippet: doc.snippet, nav: doc.nav };
}

/** Site-wide search — used by CommandPalette. */
export function searchAll(query: string, limit = 8): SearchResult[] {
  const q = normalizeSearchText(query);
  if (!q) return [];
  return getIndex()
    .fuse.search(q)
    .slice(0, limit)
    .map((r) => toResult(r.item));
}

/** Call Mode's inline search: deliberately narrower than searchAll. Call
 * Mode's fixed layout only ever renders an objection or the current
 * script's stages (see CallModeOverlay.tsx) — it has no FAQ/competitor/
 * package panel to navigate to without leaving that layout, so those types
 * are left to Ctrl+K instead of being shown here as dead-end results. */
export function searchCallMode(query: string, currentScriptId: string, limit = 6): SearchResult[] {
  const q = normalizeSearchText(query);
  if (!q) return [];
  return getIndex()
    .fuse.search(q)
    .filter(
      (r) =>
        r.item.type === "objection" ||
        (r.item.type === "script_stage" && r.item.nav.kind === "script_stage" && r.item.nav.scriptId === currentScriptId)
    )
    .slice(0, limit)
    .map((r) => toResult(r.item));
}

/** Resolves a result's nav target to a URL for CommandPalette, which can
 * navigate anywhere (unlike Call Mode's inline search, which acts on
 * in-place callbacks instead — see searchCallMode above). FAQ/packages have
 * no dedicated route, only a tab on the scripts page. */
export function resolveSearchPath(nav: SearchNav): string {
  switch (nav.kind) {
    case "script_stage":
      return `/sales-process/scripts?script=${nav.scriptId}&stage=${nav.stageId}`;
    case "objection":
      return `/sales-process/scripts?script=${nav.scriptId}&stage=${nav.stageId}&objection=${nav.objectionId}`;
    case "faq":
      return "/sales-process/scripts?tab=faq";
    case "package":
      return "/sales-process/scripts?tab=packages";
    case "competitor":
      return `/sales-process/battle-cards/${nav.competitorId}`;
  }
}
