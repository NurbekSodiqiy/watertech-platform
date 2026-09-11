"use client";

import type { ElementType } from "react";

/**
 * Shared icon-container visual used only by /company/mission-values and
 * /company/about — the plain frame + small accent-tinted badge convention
 * that predates (and was reverted back to, after) a brief attempt at tinting
 * the whole frame. Left alone per explicit instruction: this box has never
 * been the problem, so it stays exactly as originally designed.
 */
export function AccentIconVisual({
  icon: Icon,
  size = 40,
  visualClassName,
  dataParallax,
  className = "",
}: {
  icon: ElementType<{ size?: number | string }>;
  size?: number;
  /** Class the page's own GSAP query targets (".mv-visual" or ".about-visual"). */
  visualClassName: string;
  /** Parallax range read via visual.dataset.parallax — matches this page's existing tuned value. */
  dataParallax: number;
  className?: string;
}) {
  return (
    <div className={`flex h-48 w-full items-center justify-center rounded-2xl border border-border bg-surface md:h-64 ${className}`}>
      <div data-parallax={dataParallax} className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10 text-accent ${visualClassName}`}>
        <Icon size={size} />
      </div>
    </div>
  );
}
