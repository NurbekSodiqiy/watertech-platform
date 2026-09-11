"use client";

import type { ElementType } from "react";

/**
 * Shared icon-container visual used only by /company/mission-values and
 * /company/about, so both pages render icon blocks in the same accent-tinted
 * "system" instead of drifting apart. Not used anywhere else in the app.
 *
 * The decorative ripple rings and the icon sit in separate DOM nodes: GSAP's
 * scroll-driven parallax writes an inline transform directly onto the icon
 * node (via the visualClassName hook below), which would otherwise clobber a
 * CSS hover:scale on that same element (inline style always wins over a
 * utility class for the same property). Keeping hover on the outer frame and
 * the parallax target on the inner icon avoids that conflict entirely.
 */
export function AccentIconVisual({
  icon: Icon,
  size = 48,
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
    <div
      className={`relative flex h-48 w-full items-center justify-center overflow-hidden rounded-3xl border border-accent/20 bg-accent/[0.08] shadow-[0_8px_24px_rgb(var(--accent)/0.12)] transition-all duration-200 ease-out hover:scale-[1.03] hover:bg-accent/[0.12] dark:bg-accent/[0.12] dark:shadow-[0_8px_24px_rgb(var(--accent)/0.18)] dark:hover:bg-accent/[0.16] md:h-64 ${className}`}
    >
      {/* Decorative depth only — concentric ripple rings, very low opacity,
          clipped to the frame by overflow-hidden above. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 200 200"
        className="pointer-events-none absolute inset-0 h-full w-full text-accent opacity-[0.06]"
      >
        <circle cx="100" cy="100" r="28" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="52" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="76" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      <div data-parallax={dataParallax} className={`relative z-10 flex items-center justify-center text-accent ${visualClassName}`}>
        <Icon size={size} />
      </div>
    </div>
  );
}
