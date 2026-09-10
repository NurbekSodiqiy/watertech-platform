"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Breadcrumbs } from "@/components/Breadcrumbs";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function MissionValuesPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  // This page is unusually tall (6 large blocks with generous spacing) —
  // taller than the shared AppShell sidebar's own nav content. Since the
  // sidebar isn't independently sticky, letting this page grow the shared
  // document height (like a normal page would) stretches the sidebar's
  // <aside> to match via the layout's default flex align-items:stretch,
  // leaving a big blank strip once you scroll past the sidebar's real
  // (much shorter) content. Scrolling is contained to this local element
  // instead, so the page's height never leaks into that shared layout —
  // no changes needed to Sidebar/AppShell themselves.
  const scrollerRef = useRef<HTMLDivElement>(null);

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

      // Images finish loading after ScrollTrigger's first measurement, which
      // shifts each block's position slightly — refresh again once every
      // image has settled so the scrub ranges match final layout.
      const images = Array.from(pageRef.current?.querySelectorAll("img") ?? []);
      Promise.all(
        images.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) resolve();
              else img.addEventListener("load", () => resolve(), { once: true });
            })
        )
      ).then(() => ScrollTrigger.refresh());
    }, pageRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={scrollerRef} className="h-[calc(100vh-3.5rem)] overflow-y-auto">
    <div ref={pageRef} className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      {/* Header */}
      <div className="space-y-4">
        <Breadcrumbs path="/company/mission-values" />
        <div>
          <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-primary-dark">Missiya va qadriyatlar</h1>
        </div>
      </div>

      <div className="space-y-12 rounded-2xl border border-border bg-surface p-6 shadow-soft">

        {/* Mission Section — image left, text right */}
        <section>
          <div className="mv-reveal grid grid-cols-1 items-center gap-6 rounded-2xl border border-border bg-surface-alt p-6 shadow-sm md:grid-cols-2 md:p-8">
            {/* TEMPORARY test image (public/products/truba-ppr.jpg) used across all
                6 blocks to preview mask-reveal + parallax — real per-block images
                come later, the frame/parallax mechanism stays the same */}
            <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-border bg-surface md:h-64">
              <img
                src="/products/truba-ppr.jpg"
                alt=""
                data-parallax="10"
                className="mv-visual absolute inset-x-0 top-[-15%] h-[130%] w-full object-cover"
              />
            </div>
            <div className="text-center md:text-left">
              <h2 className="mb-4 text-[20px] font-bold text-primary-dark uppercase tracking-wider">Missiya</h2>
              <p className="mb-3 text-[18px] font-medium leading-relaxed text-primary md:text-[22px]">
                "Odamlar uylarida xotirjam yashashlari uchun ishonchli va uzoq xizmat qiladigan suv tizimlarini yaratish."
              </p>
              <p className="text-[15px] italic text-text-secondary">
                Suv hayot manbai, biz esa uning xavfsiz oqimini ta'minlaymiz.
              </p>
            </div>
          </div>
        </section>

        {/* Vision Section */}
        <section className="space-y-8">
          <h2 className="text-[20px] font-bold text-primary-dark">Vizyon 2030</h2>

          {/* "2030" — text left, image right */}
          <div className="mv-reveal grid grid-cols-1 items-center gap-6 rounded-2xl border border-border bg-surface-alt p-6 shadow-sm md:grid-cols-2 md:p-8">
            <div className="text-center md:order-1 md:text-left">
              <span className="mb-2 block text-[28px] font-extrabold leading-none text-primary-dark">2030</span>
              <p className="text-[14px] leading-relaxed text-text-secondary">
                2030-yilga kelib O'zbekistondagi har 3 ta yangi qurilgan uyda bizning mahsulotimiz o'rnatilgan bo'lishi va MDH davlatlariga eksport hajmini 3 barobar oshirish.
              </p>
            </div>
            <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-border bg-surface md:order-2 md:h-64">
              <img
                src="/products/truba-ppr.jpg"
                alt=""
                data-parallax="10"
                className="mv-visual absolute inset-x-0 top-[-15%] h-[130%] w-full object-cover"
              />
            </div>
          </div>

          {/* "№1" — image left, text right */}
          <div className="mv-reveal grid grid-cols-1 items-center gap-6 rounded-2xl border border-border bg-surface-alt p-6 shadow-sm md:grid-cols-2 md:p-8">
            <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-border bg-surface md:h-64">
              <img
                src="/products/truba-ppr.jpg"
                alt=""
                data-parallax="10"
                className="mv-visual absolute inset-x-0 top-[-15%] h-[130%] w-full object-cover"
              />
            </div>
            <div className="text-center md:text-left">
              <span className="mb-2 block text-[28px] font-extrabold leading-none text-primary-dark">№1</span>
              <p className="text-[14px] leading-relaxed text-text-secondary">
                Markaziy Osiyoda muhandislik santexnikasi bo'yicha №1 ekspert-hamkorga aylanish.
              </p>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="space-y-8">
          <h2 className="text-[20px] font-bold text-primary-dark">Qadriyatlarimiz</h2>

          {/* Sifat — text left, image right */}
          <div className="mv-reveal grid grid-cols-1 items-center gap-6 rounded-2xl border border-border bg-surface-alt p-6 shadow-sm md:grid-cols-2 md:p-8">
            <div className="text-center md:order-1 md:text-left">
              <h3 className="mb-2 text-[16px] font-bold text-primary-dark">Sifat – bu vijdon</h3>
              <p className="text-[14px] leading-relaxed text-text-secondary">
                Quvur devorlarining ichida nima borligini mijoz ko'rmaydi, lekin biz bilamiz. Biz nuqsonli mahsulotni chiqarmaymiz.
              </p>
            </div>
            <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-border bg-surface md:order-2 md:h-64">
              <img
                src="/products/truba-ppr.jpg"
                alt=""
                data-parallax="10"
                className="mv-visual absolute inset-x-0 top-[-15%] h-[130%] w-full object-cover"
              />
            </div>
          </div>

          {/* Innovatsiya — image left, text right */}
          <div className="mv-reveal grid grid-cols-1 items-center gap-6 rounded-2xl border border-border bg-surface-alt p-6 shadow-sm md:grid-cols-2 md:p-8">
            <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-border bg-surface md:h-64">
              <img
                src="/products/truba-ppr.jpg"
                alt=""
                data-parallax="10"
                className="mv-visual absolute inset-x-0 top-[-15%] h-[130%] w-full object-cover"
              />
            </div>
            <div className="text-center md:text-left">
              <h3 className="mb-2 text-[16px] font-bold text-primary-dark">Innovatsiya</h3>
              <p className="text-[14px] leading-relaxed text-text-secondary">
                Biz kechagi texnologiya bilan bugungi bozorni egallay olmaymiz.
              </p>
            </div>
          </div>

          {/* Xavfsizlik — text left, image right */}
          <div className="mv-reveal grid grid-cols-1 items-center gap-6 rounded-2xl border border-border bg-surface-alt p-6 shadow-sm md:grid-cols-2 md:p-8">
            <div className="text-center md:order-1 md:text-left">
              <h3 className="mb-2 text-[16px] font-bold text-primary-dark">Xavfsizlik</h3>
              <p className="text-[14px] leading-relaxed text-text-secondary">
                Bizning mahsulotimiz o'rnatilgan joyda suv toshqini bo'lmasligi kerak.
              </p>
            </div>
            <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-border bg-surface md:order-2 md:h-64">
              <img
                src="/products/truba-ppr.jpg"
                alt=""
                data-parallax="10"
                className="mv-visual absolute inset-x-0 top-[-15%] h-[130%] w-full object-cover"
              />
            </div>
          </div>
        </section>

      </div>
    </div>
    </div>
  );
}
