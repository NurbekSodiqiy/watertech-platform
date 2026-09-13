/** Text normalization shared by both the index-building side and the query
 * side of search, so "нарх" and "narx" — or "so'z" typed with any of the
 * half-dozen glyphs people use for the Uzbek apostrophe — collapse to the
 * same comparable string before Fuse ever sees them. */

// Uzbek Cyrillic -> Latin, applied letter-by-letter after lowercasing. Not a
// linguistically perfect transliteration (context-sensitive е/ye, digraphs
// like ц->ts vs s, etc. are approximated) — good enough for search matching,
// especially combined with Fuse's own fuzzy threshold.
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "x", ц: "ts", ч: "ch", ш: "sh", щ: "sh",
  ъ: "", ы: "i", ь: "", э: "e", ю: "yu", я: "ya", ў: "o'", қ: "q", ғ: "g'", ҳ: "h",
};

function cyrillicToLatin(lower: string): string {
  let out = "";
  for (const ch of lower) out += CYRILLIC_TO_LATIN[ch] ?? ch;
  return out;
}

// Every glyph people end up typing for the Uzbek apostrophe (o', o‘, o’, o`,
// oʻ, oʼ) — stripped rather than unified to one, so "so'z" and "so z" typed
// with none at all still match the same normalized string.
const APOSTROPHE_VARIANTS = /['’‘`ʻʼ]/g;

export function normalizeSearchText(text: string): string {
  return cyrillicToLatin(text.toLowerCase()).replace(APOSTROPHE_VARIANTS, "").replace(/\s+/g, " ").trim();
}
