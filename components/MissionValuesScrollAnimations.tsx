"use client";

import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function MissionValuesScrollAnimations({
  pageRef,
  scrollerRef,
}: {
  pageRef: RefObject<HTMLDivElement>;
  scrollerRef: RefObject<HTMLDivElement>;
}) {
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const scrollerEl: HTMLDivElement = scroller;

    const ctx = gsap.context(() => {
      const blocks = gsap.utils.toArray<HTMLElement>(".mv-reveal");

      // No pin anywhere: each block fades/parallaxes in as it crosses one
      // bounded entrance window ("top 85%" -> "top 45%"), then sits at rest
      // in normal document flow. Driving both the fade and the parallax off
      // the SAME trigger (instead of a separate whole-page-transit parallax
      // trigger) means the animation never needs scroll room *after* the
      // element — so the last block on the page completes correctly too,
      // without a trailing spacer.
      function buildTimelines(rangeFor: (base: number) => number) {
        const triggers: ScrollTrigger[] = [];

        blocks.forEach((block) => {
          const visual = block.querySelector<HTMLElement>(".mv-visual");
          const range = rangeFor(Number(visual?.dataset.parallax) || 10);

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: block,
              scroller: scrollerEl,
              start: "top 85%",
              // Clamp to the scroller's real max scroll: a block near the
              // bottom has no follow-content to provide the scroll room
              // "top 45%" would otherwise need, which would leave its
              // animation stuck short of complete.
              end: () => {
                const rect = block.getBoundingClientRect();
                const scrollerRect = scrollerEl.getBoundingClientRect();
                const relativeTop = rect.top - scrollerRect.top + scrollerEl.scrollTop;
                const naturalEnd = relativeTop - scrollerEl.clientHeight * 0.45;
                const maxScroll = scrollerEl.scrollHeight - scrollerEl.clientHeight;
                return Math.min(naturalEnd, maxScroll);
              },
              scrub: true,
            },
          });

          // Entrance offset is deliberately kept smaller than the gap between
          // blocks (see space-y values in the JSX below) — otherwise a block
          // still mid-entrance visually intrudes into the block after it,
          // which (since every block currently shows the same test image)
          // reads as the image appearing twice, slightly offset.
          tl.fromTo(block, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, ease: "none" }, 0);

          // The visual settles into place at a different rate than the
          // text around it, so the two never move in lockstep.
          if (visual) {
            tl.fromTo(visual, { yPercent: -range }, { yPercent: 0, ease: "none" }, 0);
          }

          if (tl.scrollTrigger) triggers.push(tl.scrollTrigger);
        });

        return () => {
          triggers.forEach((st) => st.kill());
          blocks.forEach((block) => gsap.set(block, { clearProps: "all" }));
        };
      }

      // Two separate string-query calls (not one object-conditions call) —
      // matchMedia only invokes an object-conditions callback when at least
      // one of its named queries currently matches, so a single call keyed
      // only on "isMobile" silently never fires on desktop widths at all.
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px)", () => buildTimelines((base) => base));
      mm.add("(max-width: 767px)", () => buildTimelines((base) => Math.min(6, base)));

      ScrollTrigger.refresh();
    }, pageRef);

    return () => ctx.revert();
  }, [pageRef, scrollerRef]);

  return null;
}
