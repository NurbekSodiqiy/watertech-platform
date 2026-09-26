"use client";

import { useEffect, type RefObject } from "react";

// Matches what browsers actually let you Tab to. `[hidden]` and disabled
// controls are excluded up front; anything hidden by CSS is filtered out at
// call time, since that can't be expressed as a selector.
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "[tabindex]",
  "[contenteditable='true']",
]
  .map((selector) => `${selector}:not([hidden]):not([tabindex='-1'])`)
  .join(",");

function focusableWithin(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    // offsetParent is null for display:none subtrees; position:fixed elements
    // report null too, hence the rect fallback.
    (el) => el.offsetParent !== null || el.getClientRects().length > 0
  );
}

/**
 * Keeps keyboard focus inside `containerRef` while `active` is true: focuses
 * the first focusable element on activation — or `initialFocusRef`'s element,
 * when given and focusable — cycles Tab/Shift+Tab within the container, and
 * restores focus to whatever was focused before on deactivation.
 *
 * The container itself is focused as a fallback when it holds nothing
 * focusable, so focus never escapes to the page behind an open dialog.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement>,
  active: boolean,
  initialFocusRef?: RefObject<HTMLElement>
): void {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Deferred a frame: framer-motion mounts the panel with the enter
    // animation in flight, and children rendered in the same commit aren't
    // measurable (so not "focusable") until the browser has laid them out.
    const focusFirst = requestAnimationFrame(() => {
      const focusable = focusableWithin(container);
      const preferred = initialFocusRef?.current;
      const first = preferred && focusable.includes(preferred) ? preferred : focusable[0];
      if (first) {
        first.focus();
      } else if (!container.contains(document.activeElement)) {
        container.tabIndex = -1;
        container.focus();
      }
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab" || !container) return;
      const focusable = focusableWithin(container);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;

      // Focus having drifted outside the container (a click on the page
      // behind, say) is corrected on the next Tab rather than fought over
      // with a focusin listener.
      if (!(current instanceof HTMLElement) || !container.contains(current)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(focusFirst);
      document.removeEventListener("keydown", onKeyDown);
      // Only take focus back if it's still inside the trap, or nowhere at all
      // (on <body>: the focused control was disabled while an action ran, as
      // a confirm button is) — if something else has deliberately moved it
      // since, leave it alone.
      const active = document.activeElement;
      const lost = active === null || active === document.body;
      if (previouslyFocused && (!container || lost || container.contains(active))) {
        previouslyFocused.focus();
      }
    };
  }, [containerRef, active, initialFocusRef]);
}
