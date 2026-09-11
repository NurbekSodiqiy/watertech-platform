"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Breadcrumbs } from "@/components/Breadcrumbs";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Source SVGs live in /public/icons/mission/ (stroke="currentColor", from the
// provided watertech-mission-icons set). Inlined here rather than referenced
// via <img src>, because currentColor in an externally-loaded SVG resolves
// inside that SVG's own isolated document — it can't see this page's CSS —
// so <img> would just render black in both themes. Inlining lets `text-accent`
// on the wrapping badge flow into the stroke via normal color inheritance.
function MissiyaIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24,4 C14,17 6,28 6,37 A18,18 0 1,0 42,37 C42,28 34,17 24,4 Z" />
        <path d="M13,33 Q19,29 24,33 Q29,37 35,33" />
        <path d="M13,39 Q19,35 24,39 Q29,43 35,39" />
      </g>
    </svg>
  );
}

function Vizyon2030Icon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="26" width="10" height="18" rx="2" />
        <rect x="19" y="12" width="10" height="32" rx="2" />
        <rect x="34" y="0" width="10" height="44" rx="2" />
        <circle cx="39" cy="14" r="7" />
      </g>
    </svg>
  );
}

function No1Icon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="26" width="12" height="18" rx="2" />
        <rect x="18" y="6" width="12" height="38" rx="2" />
        <rect x="34" y="30" width="12" height="14" rx="2" />
      </g>
    </svg>
  );
}

function SifatIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24,3 L4,12 L4,24 Q4,38 24,45 Q44,38 44,24 L44,12 Z" />
        <path d="M14,24 L21,31 L35,15" />
      </g>
    </svg>
  );
}

function InnovatsiyaIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="20" r="15" />
        <path d="M17,34 L17,40 Q24,45 31,40 L31,34" />
        <path d="M20,44 L28,44" />
        <path d="M24,4 L24,0" />
        <path d="M40,20 L44,20" />
        <path d="M4,20 L8,20" />
      </g>
    </svg>
  );
}

function XavfsizlikIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="10" y="22" width="28" height="22" rx="4" />
        <path d="M14,22 L14,14 A10,10 0 0,1 34,14 L34,22" />
        <circle cx="24" cy="30" r="3" />
        <path d="M24,33 L24,38" />
      </g>
    </svg>
  );
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
    }, pageRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={scrollerRef} className="mv-scroll-hide h-[calc(100vh-3.5rem)] overflow-y-auto">
    {/* This container still scrolls (needed for the height-containment fix
        and as the GSAP ScrollTrigger scroller) — only its own visual
        scrollbar is hidden, so the page shows just the one (window)
        scrollbar the rest of the site already uses. */}
    <style>{`
      .mv-scroll-hide { scrollbar-width: none; -ms-overflow-style: none; }
      .mv-scroll-hide::-webkit-scrollbar { display: none; }
    `}</style>
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
            <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-border bg-surface md:h-64">
              <div data-parallax="10" className="mv-visual flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <MissiyaIcon size={40} />
              </div>
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
            <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-border bg-surface md:order-2 md:h-64">
              <div data-parallax="10" className="mv-visual flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <Vizyon2030Icon size={40} />
              </div>
            </div>
          </div>

          {/* "№1" — image left, text right */}
          <div className="mv-reveal grid grid-cols-1 items-center gap-6 rounded-2xl border border-border bg-surface-alt p-6 shadow-sm md:grid-cols-2 md:p-8">
            <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-border bg-surface md:h-64">
              <div data-parallax="10" className="mv-visual flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <No1Icon size={40} />
              </div>
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
            <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-border bg-surface md:order-2 md:h-64">
              <div data-parallax="10" className="mv-visual flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <SifatIcon size={40} />
              </div>
            </div>
          </div>

          {/* Innovatsiya — image left, text right */}
          <div className="mv-reveal grid grid-cols-1 items-center gap-6 rounded-2xl border border-border bg-surface-alt p-6 shadow-sm md:grid-cols-2 md:p-8">
            <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-border bg-surface md:h-64">
              <div data-parallax="10" className="mv-visual flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <InnovatsiyaIcon size={40} />
              </div>
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
            <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-border bg-surface md:order-2 md:h-64">
              <div data-parallax="10" className="mv-visual flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <XavfsizlikIcon size={40} />
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
    </div>
  );
}
