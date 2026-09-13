import type { ElementType } from "react";

/**
 * Shared icon-container visual used only by /company/mission-values and
 * /company/about — the plain pale-white zone + small accent-tinted badge
 * convention. This is one of two edge-to-edge zones tiled inside a parent
 * grid that owns the card's own border/radius/overflow-hidden clip — so this
 * zone has no border or radius of its own (that would show as a seam against
 * the sibling AccentTextPanel zone) and fills the full cell height via
 * h-full rather than a fixed height, so it always matches whatever height
 * the text zone's content settles on.
 */
export function AccentIconVisual({
  icon: Icon,
  size = 40,
  className = "",
}: {
  icon: ElementType<{ size?: number | string }>;
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex h-full min-h-48 w-full items-center justify-center bg-surface md:min-h-64 ${className}`}>
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10 text-accent">
        <Icon size={size} />
      </div>
    </div>
  );
}
