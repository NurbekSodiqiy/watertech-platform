import type { ContentBundle } from "@/lib/content/loader";
import type { Product } from "@/lib/content/products";
import { findStageFor } from "@/lib/search/find-stage";
import type { PinKind, PinRef } from "@/lib/user-state/keys";

/** What a stored PinRef resolves to: a title to show and a locale-less
 * link to follow. Built server-side per locale (app/api/content-refs) and
 * held client-side as a lookup map, so pins and recents — which store ids
 * only — can be rendered and opened. */
export interface ContentRef {
  kind: PinKind;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  /** Scripts only: the stage labels, so "continue where you left off" can name
   * the stage from `scripts.position` without loading the scripts page's
   * whole content bundle. */
  stages?: { id: string; label: string }[];
}

export function refKey(ref: PinRef): string {
  return `${ref.kind}:${ref.id}`;
}

/** Same reachability rule as buildSearchDocs: an objection no script surfaces
 * has nowhere to open, so it is left out (and a pin to it is pruned). */
export function buildContentRefs(bundle: ContentBundle, products: Product[]): ContentRef[] {
  const refs: ContentRef[] = [];

  for (const script of bundle.scripts) {
    refs.push({
      kind: "script",
      id: script.id,
      title: script.name,
      href: `/sales-process/scripts?script=${encodeURIComponent(script.id)}`,
      stages: script.stages.map((stage) => ({ id: stage.id, label: stage.label })),
    });
  }

  for (const objection of bundle.objections) {
    const stageRef = findStageFor(bundle.scripts, objection.id);
    if (!stageRef) continue;
    refs.push({
      kind: "objection",
      id: objection.id,
      title: objection.label,
      href: `/sales-process/scripts?script=${encodeURIComponent(stageRef.scriptId)}&stage=${encodeURIComponent(stageRef.stageId)}&objection=${encodeURIComponent(objection.id)}`,
    });
  }

  for (const faq of bundle.faqs) {
    refs.push({
      kind: "faq",
      id: faq.id,
      title: faq.question,
      subtitle: faq.category,
      href: `/sales-process/scripts?tab=faq&faq=${encodeURIComponent(faq.id)}`,
    });
  }

  for (const competitor of bundle.competitors) {
    refs.push({
      kind: "battleCard",
      id: competitor.id,
      title: competitor.name,
      href: `/sales-process/battle-cards/${encodeURIComponent(competitor.id)}`,
    });
  }

  for (const product of products) {
    refs.push({
      kind: "product",
      id: product.id,
      title: product.name_ru,
      href: `/products?product=${encodeURIComponent(product.id)}`,
    });
  }

  return refs;
}
