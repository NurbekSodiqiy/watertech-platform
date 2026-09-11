"use client";

import type { ReactNode } from "react";

/**
 * The text half of a zigzag icon+text block, rendered as a solid accent-blue
 * card (not a tint) so it reads clearly at a glance — the icon box's own
 * subtle tint wasn't visible enough, so this half carries the color instead.
 * Radius/padding match AccentIconVisual's frame so the pair reads as matching
 * halves of one block — height is a MINIMUM only (not fixed), since a fixed
 * height clipped longer copy (e.g. the Mission block's two paragraphs) once
 * content exceeded it. Text inside must use white/near-white — the page's
 * normal text-primary-dark token is unreadable on a solid accent fill.
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
      className={`relative flex min-h-48 w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-accent p-6 text-center shadow-[0_8px_24px_rgb(var(--accent)/0.2)] md:min-h-64 md:items-start md:p-8 md:text-left ${className}`}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}
