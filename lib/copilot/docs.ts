/** Pure half of Copilot retrieval: turns content into searchable documents
 * and ranks them for a question. No I/O here — lib/copilot/retrieve.ts wires
 * it to the cached content loaders, and tests call it directly. */

import Fuse from "fuse.js";
import type { ContentBundle } from "@/lib/content/loader";
import type { Product } from "@/lib/content/products";
import { buildSearchDocs, resolveSearchPath } from "@/lib/search/index";
import { normalizeSearchText } from "@/lib/search/normalize";
import type { CopilotSourceType } from "@/lib/copilot/protocol";

export const MAX_CHUNK_CHARS = 1200;
export const MAX_CONTEXT_CHARS = 6000;

export interface CopilotDoc {
  id: string;
  type: CopilotSourceType;
  title: string;
  href: string;
  /** Raw, human-readable body sent to the model as a CONTEXT block. */
  text: string;
  // Normalized match fields, same weighting idea as lib/search/index.ts.
  keywords: string;
  searchTitle: string;
  body: string;
}

export interface CopilotChunk {
  id: string;
  type: CopilotSourceType;
  title: string;
  text: string;
  href: string;
}

function lines(parts: [label: string, value: string | undefined][]): string {
  return parts
    .filter(([, value]) => value !== undefined && value.trim() !== "")
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
}

/** Raw text per search-doc id, using the id scheme buildSearchDocs emits. */
function rawTexts(bundle: ContentBundle): Map<string, string> {
  const texts = new Map<string, string>();

  for (const o of bundle.objections) {
    texts.set(
      `objection:${o.id}`,
      lines([
        ["Client says", o.clientSays],
        ["Real meaning", o.realMeaning],
        ["Operator response", o.response],
        ["Follow-up", o.followUp],
      ])
    );
  }

  for (const script of bundle.scripts) {
    for (const stage of script.stages) {
      const turns = stage.turns.map((turn) => {
        const header = turn.subStepHeader ? `${turn.subStepHeader}\n` : "";
        const text = turn.condition ? `(agar ${turn.condition}, ${turn.text})` : turn.text;
        return `${header}${turn.speaker}: ${text}`;
      });
      texts.set(`stage:${script.id}:${stage.id}`, [`Script: ${script.name}`, ...turns].join("\n"));
    }
  }

  for (const faq of bundle.faqs) {
    texts.set(`faq:${faq.id}`, lines([["Question", faq.question], ["Answer", faq.answer]]));
  }

  for (const c of bundle.competitors) {
    texts.set(
      `competitor:${c.id}`,
      lines([
        ["Assortment", c.assortment],
        ["Base discount", c.baseDiscount],
        ["Volume discount", c.volumeDiscount],
        ["Retro bonus", c.retroBonus],
        ["Max discount", c.maxDiscount],
        ["Payment terms", c.paymentTerms],
        ["Payment method", c.paymentMethod],
        ["Delivery time", c.deliveryTime],
        ["Logistics", c.logistics],
        ["Dealer coverage", c.dealerCoverage],
        ["Certificates", c.certificates],
        ["Marketing offers", c.marketingOffers],
        ["Threat level", c.threatLevel],
      ])
    );
  }

  for (const group of bundle.packageGroups) {
    for (const p of group.packages) {
      texts.set(
        `package:${p.id}`,
        lines([
          ["Package", p.name],
          ["Group", group.title],
          ["Order volume", p.orderVolume],
          ["Payment terms", p.paymentTerms],
          ["Estimated discount", p.estimatedDiscount],
          ["Logistics", p.logistics],
          ["Delivery time", p.deliveryTime],
        ])
      );
    }
  }

  return texts;
}

/** The palette's SearchDoc set (with full raw bodies instead of snippets),
 * plus product docs, which the palette doesn't index. */
export function buildCopilotDocs(bundle: ContentBundle, products: Product[]): CopilotDoc[] {
  const texts = rawTexts(bundle);
  const docs: CopilotDoc[] = [];

  for (const doc of buildSearchDocs(bundle)) {
    const text = texts.get(doc.id) ?? doc.snippet;
    docs.push({
      id: doc.id,
      type: doc.type,
      title: doc.title,
      href: resolveSearchPath(doc.nav),
      text,
      keywords: doc.keywords,
      searchTitle: doc.searchTitle,
      // Package docs in the palette index skip logistics/delivery prose —
      // exactly what operators ask Copilot about, so match on the full text.
      body: doc.type === "package" ? normalizeSearchText(text) : doc.body,
    });
  }

  for (const product of products) {
    const text = lines([
      ["Product", product.name_ru],
      ["Line", product.line],
      ["Category", product.category],
      ["Material", product.material],
      ["Sizes", product.sizes.join(", ")],
    ]);
    docs.push({
      id: `product:${product.id}`,
      type: "product",
      title: product.name_ru,
      href: "/products",
      text,
      keywords: normalizeSearchText([product.line, product.category, product.material ?? ""].join(" ")),
      searchTitle: normalizeSearchText(product.name_ru),
      body: normalizeSearchText(text),
    });
  }

  return docs;
}

// Question filler that would otherwise fuzzy-match half the corpus. Written
// in natural spelling and normalized once, so Cyrillic entries collapse to
// the same transliterated form the query goes through.
const STOPWORDS = new Set(
  [
    "va", "bu", "shu", "u", "ular", "bilan", "uchun", "haqida", "bo'yicha", "qanday", "qanaqa", "nima", "nimaga",
    "necha", "qancha", "qaysi", "qachon", "qayerda", "kim", "mi", "mu", "bormi", "bor", "yo'q", "kerak", "ham",
    "yoki", "edi", "emas", "men", "siz", "biz", "sizlar", "mening", "sizning", "agar", "lekin", "bo'ladi",
    "bo'lsa", "beradi", "aytib", "bering", "ayting", "iltimos", "mijoz", "mijozga", "deydi", "desa",
    "как", "что", "это", "для", "при", "или", "есть", "какие", "какой", "какая", "сколько", "можно", "нужно",
    "по", "на", "в", "с", "у", "о", "об", "не", "да", "нет", "ли", "я", "мы", "вы", "он", "она", "они", "если",
    "клиент", "клиенту", "говорит", "скажите", "пожалуйста", "а", "и", "но", "то", "же",
  ].map(normalizeSearchText)
);

const MAX_TOKENS = 12;

export function queryTokens(question: string): string[] {
  const tokens = normalizeSearchText(question)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  return Array.from(new Set(tokens)).slice(0, MAX_TOKENS);
}

export interface CopilotIndex {
  search(question: string, k?: number): CopilotChunk[];
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/** A natural-language question is a poor single Fuse pattern (Fuse scores the
 * whole string as one fuzzy needle), so each meaningful token is searched on
 * its own and the per-doc relevance summed: docs matching more of the
 * question, in heavier fields, rank first. Short tokens (≤ 4 chars) must
 * match exactly — fuzzily they'd hit nearly every body. */
export function createCopilotIndex(docs: CopilotDoc[]): CopilotIndex {
  const fuse = new Fuse(docs, {
    keys: [
      { name: "keywords", weight: 0.5 },
      { name: "searchTitle", weight: 0.3 },
      { name: "body", weight: 0.2 },
    ],
    threshold: 0.3,
    ignoreLocation: true,
    includeScore: true,
    useExtendedSearch: true,
  });

  return {
    search(question, k = 8) {
      const tokens = queryTokens(question);
      if (tokens.length === 0) return [];

      const scores = new Map<number, number>();
      for (const token of tokens) {
        const pattern = token.length <= 4 ? `'${token}` : token;
        for (const hit of fuse.search(pattern)) {
          scores.set(hit.refIndex, (scores.get(hit.refIndex) ?? 0) + (1 - (hit.score ?? 1)));
        }
      }

      const ranked = Array.from(scores.entries())
        .sort((a, b) => b[1] - a[1] || a[0] - b[0])
        .slice(0, k);

      const chunks: CopilotChunk[] = [];
      let budget = MAX_CONTEXT_CHARS;
      for (const [index] of ranked) {
        if (budget < 200) break;
        const doc = docs[index];
        const text = truncate(doc.text, Math.min(MAX_CHUNK_CHARS, budget));
        budget -= text.length;
        chunks.push({ id: doc.id, type: doc.type, title: doc.title, text, href: doc.href });
      }
      return chunks;
    },
  };
}
