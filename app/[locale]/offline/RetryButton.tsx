"use client";

import { EmptyState } from "@/components/EmptyState";

/** The only interactive part of the offline page. `location.reload()` rather
 * than a router refresh: when the page is being served from the precache the
 * router has nothing to re-fetch, and a full reload is what re-runs the
 * service worker's network-first attempt. Wrapped in a client component (not
 * inlined in the page) because that closure can't cross the RSC boundary as
 * a prop — the page itself stays a Server Component reading the translations.
 * `stateKey` (not `icon`) for the same reason: a component reference can't
 * cross that boundary either, so EmptyState resolves it from the string. */
export function OfflineEmptyState({
  title,
  reason,
  retryLabel,
}: {
  title: string;
  reason: string;
  retryLabel: string;
}) {
  return (
    <EmptyState
      stateKey="offline"
      title={title}
      reason={reason}
      action={{ label: retryLabel, onClick: () => location.reload() }}
    />
  );
}
