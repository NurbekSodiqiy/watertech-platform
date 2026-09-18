"use client";

import type { ReactNode } from "react";

/**
 * The text half of a zigzag icon+text block, rendered as a solid accent-blue
 * fill. This is one of two edge-to-edge zones tiled inside a parent grid
 * that owns the card's own border/radius/overflow-hidden clip — so this
 * zone has no radius, border, or shadow of its own (any of those would
 * inset the blue away from the card's real edge, recreating the "floating
 * chip inside a white card" look this replaced). It fills the full cell
 * height via h-full plus a min-height floor, so short copy still looks
 * intentional while long copy (e.g. the Mission block's two paragraphs)
 * is never clipped. Text inside must use text-on-accent (near-white in
 * light mode, near-bg in dark mode) — the page's normal text-primary-dark
 * token is unreadable on a solid accent fill, and hard-coded white text
 * fails contrast against the lighter dark-mode accent color.
 */
export function AccentTextPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex h-full min-h-48 w-full flex-col items-center justify-center bg-accent p-6 text-center md:min-h-64 md:items-start md:p-8 md:text-left ${className}`}
    >
      {children}
    </div>
  );
}
