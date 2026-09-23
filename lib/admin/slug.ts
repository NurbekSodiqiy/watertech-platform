/** Uzbek Latin + Russian Cyrillic -> the kebab-case shape `idSchema`
 * requires (`/^[a-z0-9-]+$/`, lib/admin/schemas.ts). Feeds the id-autofill
 * behavior in EntityForm/ScriptEditor/SopEditor: a manager types a title in
 * Uzbek or Russian, the id field fills in with a slug it can actually save. */

/** Uzbek Latin's two apostrophe letters (oʻ/gʻ) and their common ASCII/typographic
 * spellings — dropped rather than turned into a separator, so "bo'lim" becomes
 * "bolim", not "bo-lim". */
const APOSTROPHE_LETTERS = /[ʻʼ'’`]/g;

/** Russian Cyrillic -> Latin, the practical (not scientific) transliteration
 * scheme used for slugs: one Latin letter per Cyrillic letter where there is
 * one, a short digraph where there isn't, and nothing for the two silent signs. */
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y",
  ь: "", э: "e", ю: "yu", я: "ya",
};

function transliterate(text: string): string {
  return text.replace(APOSTROPHE_LETTERS, "").replace(/[а-яё]/gi, (letter) => {
    const latin = CYRILLIC_TO_LATIN[letter.toLowerCase()];
    if (latin === undefined) return letter;
    return letter === letter.toUpperCase() ? latin.charAt(0).toUpperCase() + latin.slice(1) : latin;
  });
}

/** Uzbek/Russian title text -> a slug matching `idSchema`. Empty input (or
 * input that is only punctuation) yields `""` — callers treat that the same
 * as an id the manager hasn't typed yet. */
export function toSlug(text: string): string {
  return transliterate(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
