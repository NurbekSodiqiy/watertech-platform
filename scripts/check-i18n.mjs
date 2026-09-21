#!/usr/bin/env node
// Guard for CLAUDE.md §13: every user-visible string goes through next-intl.
//
// Scans app/[locale]/** and components/** (.tsx) with the TypeScript compiler
// API and reports, as `file:line  kind  "text"`:
//   - JSX text nodes that contain letters
//   - string literals rendered as JSX children ({"text"}, {cond ? "a" : "b"})
//   - string literals in aria-label / placeholder / title / alt / label props
// Exits 1 when anything is found. Text that is legitimately not translatable
// (brand names, units, keyboard keys) lives in scripts/i18n-allowlist.json,
// one entry per exact string, each with a reason.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const scanRoots = [join(root, "app", "[locale]"), join(root, "components")];
const checkedProps = new Set(["aria-label", "placeholder", "title", "alt", "label"]);

const allowlist = JSON.parse(readFileSync(join(root, "scripts", "i18n-allowlist.json"), "utf8"));
const allowed = new Set();
for (const entry of allowlist.entries) {
  if (typeof entry.value !== "string" || typeof entry.reason !== "string" || !entry.reason.trim()) {
    console.error(`i18n-allowlist.json: every entry needs a "value" and a non-empty "reason" (${JSON.stringify(entry)})`);
    process.exit(2);
  }
  allowed.add(entry.value);
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (name.endsWith(".tsx")) yield full;
  }
}

const hasLetters = (s) => /\p{L}/u.test(s);
// HTML entities (&nbsp; &middot; &amp;) are not copy.
const stripEntities = (s) => s.replace(/&(?:#\d+|#x[\da-f]+|[a-z]+);/gi, " ");

function isTranslatable(text) {
  const t = stripEntities(text).trim();
  return hasLetters(t) && !allowed.has(t);
}

/** String literals a JSX expression can render directly. Descends through
 * conditionals, ||/??/+ and template literals, but NOT into calls — so
 * `t("key")` and `formatX("y")` are never flagged. */
function collectLiterals(node, out) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    out.push(node);
  } else if (ts.isTemplateExpression(node)) {
    out.push(node.head);
    for (const span of node.templateSpans) {
      out.push(span.literal);
      collectLiterals(span.expression, out);
    }
  } else if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node)) {
    collectLiterals(node.expression, out);
  } else if (ts.isConditionalExpression(node)) {
    collectLiterals(node.whenTrue, out);
    collectLiterals(node.whenFalse, out);
  } else if (ts.isBinaryExpression(node)) {
    const k = node.operatorToken.kind;
    if (
      k === ts.SyntaxKind.BarBarToken ||
      k === ts.SyntaxKind.QuestionQuestionToken ||
      k === ts.SyntaxKind.PlusToken ||
      k === ts.SyntaxKind.AmpersandAmpersandToken
    ) {
      collectLiterals(node.left, out);
      collectLiterals(node.right, out);
    }
  }
}

const findings = [];

function scan(file) {
  const source = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const rel = relative(root, file).split(sep).join("/");

  const report = (pos, kind, text) => {
    const { line } = sf.getLineAndCharacterOfPosition(pos);
    findings.push({ file: rel, line: line + 1, kind, text: stripEntities(text).replace(/\s+/g, " ").trim() });
  };

  const reportLiterals = (expr, kind) => {
    const lits = [];
    collectLiterals(expr, lits);
    for (const lit of lits) {
      if (isTranslatable(lit.text)) report(lit.getStart(sf), kind, lit.text);
    }
  };

  const visit = (node) => {
    if (ts.isJsxText(node)) {
      if (isTranslatable(node.text)) {
        const lead = node.text.length - node.text.trimStart().length;
        report(node.getFullStart() + lead, "text", node.text);
      }
    } else if (ts.isJsxExpression(node) && node.expression && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      reportLiterals(node.expression, "child");
    } else if (ts.isJsxAttribute(node) && checkedProps.has(node.name.getText(sf)) && node.initializer) {
      const init = node.initializer;
      if (ts.isStringLiteral(init)) {
        if (isTranslatable(init.text)) report(init.getStart(sf), node.name.getText(sf), init.text);
      } else if (ts.isJsxExpression(init) && init.expression) {
        reportLiterals(init.expression, node.name.getText(sf));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

for (const dir of scanRoots) for (const file of walk(dir)) scan(file);

findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
for (const f of findings) console.log(`${f.file}:${f.line}  ${f.kind}  ${JSON.stringify(f.text)}`);

if (findings.length > 0) {
  console.error(`\ncheck:i18n — ${findings.length} hard-coded string(s). Move them to messages/{uz,ru}.json (CLAUDE.md §13), or allow-list them in scripts/i18n-allowlist.json with a reason.`);
  process.exit(1);
}
console.log("check:i18n — no hard-coded strings found.");
