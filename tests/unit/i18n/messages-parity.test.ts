import { describe, expect, it } from "vitest";
import uz from "@/messages/uz.json";
import ru from "@/messages/ru.json";

type Messages = { [key: string]: string | Messages };

function flatten(tree: Messages, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out.set(path, value);
    else for (const [p, v] of flatten(value, path)) out.set(p, v);
  }
  return out;
}

/** Placeholder names and rich-text tags a message uses, e.g. `{name}`, `{n, plural, …}`
 * and `<strong>`. The plural/select branches are wording, not interface, so only the
 * argument name is recorded — a locale may use different branches (Russian has more). */
function placeholders(message: string): string[] {
  const found = new Set<string>();

  /** Index just past the `}` that closes the `{` at `open`. */
  function closeOf(text: string, open: number): number {
    let depth = 0;
    for (let i = open; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}" && --depth === 0) return i + 1;
    }
    return text.length;
  }

  function scan(text: string): void {
    for (let i = 0; i < text.length; ) {
      if (text[i] !== "{") {
        i++;
        continue;
      }
      const end = closeOf(text, i);
      const inner = text.slice(i + 1, end - 1);
      const [name, kind] = inner.split(",").map((part) => part.trim());
      if (name) found.add(name);
      if (kind === "plural" || kind === "select" || kind === "selectordinal") {
        // Branches look like `one {…} other {…}`; each can use further arguments.
        const body = inner.slice(inner.indexOf(",", inner.indexOf(",") + 1) + 1);
        for (let b = body.indexOf("{"); b !== -1; b = body.indexOf("{", closeOf(body, b))) {
          scan(body.slice(b + 1, closeOf(body, b) - 1));
        }
      }
      i = end;
    }
  }

  scan(message);
  for (const tag of message.matchAll(/<\/?([A-Za-z][\w-]*)>/g)) found.add(`<${tag[1]}>`);
  return [...found].sort();
}

const uzMessages = flatten(uz as Messages);
const ruMessages = flatten(ru as Messages);

describe("messages parity (uz ⇄ ru)", () => {
  it("has the same key set in both locales", () => {
    const onlyUz = [...uzMessages.keys()].filter((k) => !ruMessages.has(k));
    const onlyRu = [...ruMessages.keys()].filter((k) => !uzMessages.has(k));
    expect({ onlyUz, onlyRu }).toEqual({ onlyUz: [], onlyRu: [] });
  });

  it("has no empty values", () => {
    for (const [locale, messages] of [["uz", uzMessages], ["ru", ruMessages]] as const) {
      const empty = [...messages].filter(([, v]) => v.trim() === "").map(([k]) => k);
      expect({ locale, empty }).toEqual({ locale, empty: [] });
    }
  });

  it("uses identical ICU placeholders and rich tags per key", () => {
    const mismatched: { key: string; uz: string[]; ru: string[] }[] = [];
    for (const [key, uzValue] of uzMessages) {
      const ruValue = ruMessages.get(key);
      if (ruValue === undefined) continue;
      const a = placeholders(uzValue);
      const b = placeholders(ruValue);
      if (a.join("|") !== b.join("|")) mismatched.push({ key, uz: a, ru: b });
    }
    expect(mismatched).toEqual([]);
  });
});
