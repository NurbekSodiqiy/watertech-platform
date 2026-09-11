"use client";

import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function AboutScrollAnimations({
  pageRef,
  scrollerRef,
}: {
  pageRef: RefObject<HTMLDivElement>;
  scrollerRef: RefObject<HTMLDivElement>;
}) {
  useEffect(() => {
    if (!scrollerRef.current) return;
    const scroller: HTMLDivElement = scrollerRef.current;

    const ctx = gsap.context(() => {
      // Clamp to the scroller's real max scroll so the last element (which
      // has no follow-content to provide scroll room) still reaches full
      // progress instead of stopping short.
      function clampedEnd(trigger: HTMLElement) {
        return () => {
          const rect = trigger.getBoundingClientRect();
          const scrollerRect = scroller.getBoundingClientRect();
          const relativeTop = rect.top - scrollerRect.top + scroller.scrollTop;
          const naturalEnd = relativeTop - scroller.clientHeight * 0.45;
          const maxScroll = scroller.scrollHeight - scroller.clientHeight;
          return Math.min(naturalEnd, maxScroll);
        };
      }

      // Two separate string-query matchMedia calls — an object-conditions
      // call only fires when at least one of its named queries currently
      // matches, so a single call keyed on one breakpoint silently never
      // runs on the other (the bug that broke this exact animation on the
      // mission-values page once already).
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px)", () => buildAnimations((base) => base));
      mm.add("(max-width: 767px)", () => buildAnimations((base) => Math.min(6, base)));

      function buildAnimations(rangeFor: (base: number) => number) {
        const cleanups: Array<() => void> = [];

        // Badge row: one trigger for the whole row, cards reveal together
        // with a slight stagger.
        const badgeRow = pageRef.current?.querySelector<HTMLElement>(".about-badges-row");
        if (badgeRow) {
          const items = gsap.utils.toArray<HTMLElement>(".about-badge-item", badgeRow);
          gsap.fromTo(
            items,
            { autoAlpha: 0, y: 20 },
            {
              autoAlpha: 1,
              y: 0,
              ease: "none",
              stagger: 0.15,
              scrollTrigger: {
                trigger: badgeRow,
                scroller,
                start: "top 85%",
                end: clampedEnd(badgeRow),
                scrub: true,
              },
            }
          );
          cleanups.push(() => items.forEach((el) => gsap.set(el, { clearProps: "all" })));
        }

        // Paragraph sections: zigzag blocks, each with its own fade-in +
        // icon-badge parallax, same mechanism as mission-values.
        const blocks = gsap.utils.toArray<HTMLElement>(".about-reveal");
        blocks.forEach((block) => {
          const visual = block.querySelector<HTMLElement>(".about-visual");
          const range = rangeFor(Number(visual?.dataset.parallax) || 20);

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: block,
              scroller,
              start: "top 85%",
              end: clampedEnd(block),
              scrub: true,
            },
          });

          tl.fromTo(block, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, ease: "none" }, 0);
          if (visual) {
            tl.fromTo(visual, { yPercent: -range }, { yPercent: 0, ease: "none" }, 0);
          }
        });
        cleanups.push(() => blocks.forEach((block) => gsap.set(block, { clearProps: "all" })));

        return () => cleanups.forEach((fn) => fn());
      }

      ScrollTrigger.refresh();
    }, pageRef);

    return () => ctx.revert();
  }, [pageRef, scrollerRef]);

  return null;
}
