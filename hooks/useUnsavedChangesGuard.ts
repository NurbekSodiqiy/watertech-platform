"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UnsavedChangesGuard {
  /** True while a "leave without saving?" confirmation is open — the caller
   * renders it through the existing ConfirmDialog (components/admin/ConfirmDialog.tsx). */
  blocked: boolean;
  /** Leaves for the stashed destination and clears the block. */
  confirmLeave: () => void;
  /** Cancels the pending navigation, staying on the form. */
  cancelLeave: () => void;
}

/**
 * Warns before a manager loses an in-progress edit:
 *  - a native `beforeunload` prompt for tab close/refresh/external navigation;
 *  - an in-app confirm for a same-app link click, intercepted at the document
 *    level rather than by changing every `Link` usage in the admin area —
 *    every `Link` (from `@/i18n/routing`, Sidebar, TopBar, this form's own
 *    Cancel link) renders a real `<a href>` with the final, already
 *    locale-resolved URL, so walking up from the click target to that anchor
 *    and reading its `href` attribute needs no coupling to next-intl's router;
 *    a confirmed leave is a hard navigation (`window.location.href`) rather
 *    than a soft one, which sidesteps any risk of re-deriving the wrong
 *    locale prefix and is a perfectly fine trade once the manager has chosen
 *    to leave anyway;
 *  - Ctrl/Cmd+S, wired to the caller's own submit rather than the browser's
 *    save-page dialog.
 *
 * Known gap: browser back/forward (`popstate`) is not intercepted — out of
 * proportion for a ~30-user internal tool. `beforeunload` still covers a
 * closed tab or an address-bar navigation.
 */
export function useUnsavedChangesGuard({
  isDirty,
  onSave,
}: {
  isDirty: boolean;
  /** Ctrl/Cmd+S — the caller's own submit trigger (e.g. `handleSubmit(submit)`). */
  onSave?: () => void;
}): UnsavedChangesGuard {
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!isDirtyRef.current) return;
      event.preventDefault();
      // Legacy requirement for Chrome to show its own prompt.
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!isDirtyRef.current) return;
      // A modified click (open in new tab, etc.) or one already handled
      // elsewhere isn't a same-tab navigation away from the form.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      event.preventDefault();
      setPendingHref(`${url.pathname}${url.search}${url.hash}`);
    }
    // Capture phase: runs before the click reaches the anchor's own handler.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!onSave) return;
      const isSaveShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s";
      if (!isSaveShortcut) return;
      event.preventDefault();
      onSave();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onSave]);

  const confirmLeave = useCallback(() => {
    if (pendingHref) window.location.href = pendingHref;
    setPendingHref(null);
  }, [pendingHref]);

  const cancelLeave = useCallback(() => setPendingHref(null), []);

  return { blocked: pendingHref !== null, confirmLeave, cancelLeave };
}
