import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// ConfirmDialog guards every destructive admin write (deletes, role and status
// changes on the person page). It is an alertdialog with aria-modal, so it must
// behave as one: focus trapped inside and restored after, Escape cancels unless
// the write is in flight (R3 release audit). vitest runs in node here, so this
// pins the wiring; the behaviour is exercised by tests/e2e/a11y.spec.ts
// ("admin keyboard walk") and the hook by its own users.

const source = readFileSync(path.resolve(__dirname, "../../../components/admin/ConfirmDialog.tsx"), "utf8");

describe("ConfirmDialog", () => {
  it("traps focus in its panel while open", () => {
    expect(source).toContain('from "@/hooks/useFocusTrap"');
    expect(source).toMatch(/useFocusTrap\(panelRef, open\)/);
    expect(source).toMatch(/ref=\{panelRef\}\s+role="alertdialog"/);
  });

  it("cancels on Escape, but not while the action is pending", () => {
    expect(source).toMatch(/if \(!open \|\| pending\) return;/);
    expect(source).toMatch(/event\.key === "Escape"\) onCancel\(\)/);
  });
});
