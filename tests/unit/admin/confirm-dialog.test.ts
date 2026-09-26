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
    // Optionally starting on a field of the body (RemovePersonDialog's typed
    // confirmation) instead of Cancel.
    expect(source).toMatch(/useFocusTrap\(panelRef, open(, initialFocusRef)?\)/);
    expect(source).toMatch(/ref=\{panelRef\}\s+role="alertdialog"/);
  });

  it("cancels on Escape, but not while the action is pending", () => {
    expect(source).toMatch(/if \(!open \|\| pending\) return;/);
    expect(source).toMatch(/event\.key === "Escape"\) onCancel\(\)/);
  });

  it("keeps the confirm button disabled while pending or while the body says so", () => {
    expect(source).toMatch(/onClick=\{onConfirm\}\s+disabled=\{pending \|\| confirmDisabled\}/);
  });

  it("draws danger as a tinted fill with dark text, never white on the solid status colour", () => {
    // White on bg-status-outdated is 3.71:1 in the light theme (docs/AUDIT.md
    // §3); the pair used instead is measured in tests/unit/ui/design-tokens.test.ts.
    expect(source).toContain("border-status-outdated bg-status-outdated/15 text-primary-dark hover:bg-status-outdated/25");
    expect(source).not.toMatch(/bg-status-outdated text-surface/);
  });
});
