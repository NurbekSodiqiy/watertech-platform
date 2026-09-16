"use client";

import { RotateCw } from "lucide-react";

/** The only interactive part of the offline page. `location.reload()` rather
 * than a router refresh: when the page is being served from the precache the
 * router has nothing to re-fetch, and a full reload is what re-runs the
 * service worker's network-first attempt. */
export function RetryButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => location.reload()}
      className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[14px] font-semibold text-surface shadow-softer transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary-light"
    >
      <RotateCw size={16} aria-hidden="true" />
      {label}
    </button>
  );
}
