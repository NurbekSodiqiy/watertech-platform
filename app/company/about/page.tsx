"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CalendarDays, Settings, ShieldCheck, Globe, Factory, Cog, Target, Award, type LucideIcon } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type Block =
  | { kind: "badge"; Icon: LucideIcon; label: string }
  | { kind: "section"; Icon: LucideIcon; title: string; body: string };

// Odd blocks: icon left, text right. Even blocks: text left, icon right —
// same zigzag convention as /company/mission-values.
const BLOCKS: Block[] = [
  { kind: "badge", Icon: CalendarDays, label: "2021-yildan buyon" },
  { kind: "badge", Icon: Settings, label: "Germaniya texnologiyasi" },
  { kind: "badge", Icon: ShieldCheck, label: "Xalqaro standartlar" },
  { kind: "badge", Icon: Globe, label: "Xorijga eksport" },
  {
    kind: "section",
    Icon: Factory,
    title: "Biz haqimizda",
    body: "WATERTECH – bu 2021-yildan buyon O'zbekistonda faoliyat yuritayotgan, kanalizatsiya tizimlari uchun truba va fitinglar ishlab chiqaruvchi mahalliy brenddir. Kompaniyamiz o'z faoliyatini Germaniya texnologiyasi asosida tashkil etgan bo'lib, har bir mahsulotda sifat, ishonchlilik va uzoq muddatli xizmat kafolatini ta'minlaydi.",
  },
  {
    kind: "section",
    Icon: Cog,
    title: "Ishlab chiqarish",
    body: "Ishlab chiqarish jarayonida biz yuqori sifatli polipropilen xom ashyolaridan foydalanamiz. Natijada WATERTECH truba va fitinglari nafaqat mahalliy bozorda, balki xorijiy bozorlarda ham o'z o'rnini topmoqda.",
  },
  {
    kind: "section",
    Icon: Target,
    title: "Maqsadimiz",
    body: "Kompaniyamizning asosiy maqsadi – mijozlarga zamonaviy, chidamli va samarali kanalizatsiya tizimlarini taqdim etishdir. Har bir mahsulot texnik talab va xalqaro standartlarga muvofiq sinovdan o'tkaziladi.",
  },
  {
    kind: "section",
    Icon: Award,
    title: "Nega WATERTECH",
    body: "WATERTECH – bu yangilik, texnologiya va ishonch uyg'unlashgan brend. Biz mijozlarimiz bilan uzoq muddatli hamkorlikni qadrlaymiz va har bir loyiha uchun eng optimal yechimlarni taklif etamiz.",
  },
];

export default function AboutPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  // This page is taller than the AppShell sidebar's own nav content (same
  // situation already solved on /company/mission-values). Since the sidebar
  // isn't sticky, it stretches to match whichever column is tallest via the
  // layout's default flex align-items:stretch — so this page's own scroll
  // is kept inside a bounded, local element instead of the shared document,
  // and that element's own scrollbar is hidden so only the window's shows.
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollerRef.current) return;
    const scroller: HTMLDivElement = scrollerRef.current;

    const ctx = gsap.context(() => {
      const blocks = gsap.utils.toArray<HTMLElement>(".about-reveal");

      // Two separate string-query matchMedia calls — an object-conditions
      // call only fires when at least one of its named queries currently
      // matches, so a single call keyed on one breakpoint silently never
      // runs on the other (the bug that broke this exact animation on the
      // mission-values page once already).
      const mm = gsap.matchMedia();

      mm.add("(min-width: 768px)", () => buildTimelines((base) => base));
      mm.add("(max-width: 767px)", () => buildTimelines((base) => Math.min(6, base)));

      function buildTimelines(rangeFor: (base: number) => number) {
        blocks.forEach((block) => {
          const visual = block.querySelector<HTMLElement>(".about-visual");
          const range = rangeFor(Number(visual?.dataset.parallax) || 20);

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: block,
              scroller,
              start: "top 85%",
              // Clamp to the scroller's real max scroll so the last block
              // (which has no follow-content to provide scroll room) still
              // reaches full progress instead of stopping short.
              end: () => {
                const rect = block.getBoundingClientRect();
                const scrollerRect = scroller.getBoundingClientRect();
                const relativeTop = rect.top - scrollerRect.top + scroller.scrollTop;
                const naturalEnd = relativeTop - scroller.clientHeight * 0.45;
                const maxScroll = scroller.scrollHeight - scroller.clientHeight;
                return Math.min(naturalEnd, maxScroll);
              },
              scrub: true,
            },
          });

          tl.fromTo(block, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, ease: "none" }, 0);
          if (visual) {
            tl.fromTo(visual, { yPercent: -range }, { yPercent: 0, ease: "none" }, 0);
          }
        });

        return () => {
          blocks.forEach((block) => gsap.set(block, { clearProps: "all" }));
        };
      }

      ScrollTrigger.refresh();
    }, pageRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={scrollerRef} className="about-scroll-hide h-[calc(100vh-3.5rem)] overflow-y-auto">
      {/* Scrolls internally (keeps this page's height off the shared
          AppShell layout) — only its own visual scrollbar is hidden, so the
          page still shows just the one (window) scrollbar the rest of the
          site uses. */}
      <style>{`
        .about-scroll-hide { scrollbar-width: none; -ms-overflow-style: none; }
        .about-scroll-hide::-webkit-scrollbar { display: none; }
      `}</style>
      <div ref={pageRef} className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        {/* Header */}
        <div className="space-y-4">
          <Breadcrumbs path="/company/about" />
          <div>
            <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-primary-dark">Kompaniya haqida</h1>
          </div>
        </div>

        <div className="space-y-8 rounded-2xl border border-border bg-surface p-6 shadow-soft">
          {BLOCKS.map((block, i) => {
            const iconLeft = i % 2 === 0; // odd block number (1-indexed) = icon left
            const key = block.kind === "badge" ? block.label : block.title;

            const iconColumn = (
              <div className={`flex h-48 w-full items-center justify-center rounded-2xl border border-border bg-surface-alt md:h-56 ${iconLeft ? "" : "md:order-2"}`}>
                <div data-parallax="20" className="about-visual flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <block.Icon size={40} />
                </div>
              </div>
            );

            const textColumn = (
              <div className={`text-center md:text-left ${iconLeft ? "" : "md:order-1"}`}>
                {block.kind === "badge" ? (
                  <h2 className="text-[22px] font-bold text-primary-dark">{block.label}</h2>
                ) : (
                  <>
                    <h2 className="mb-3 text-[18px] font-bold text-primary-dark">{block.title}</h2>
                    <p className="text-[15px] leading-relaxed text-text-secondary">{block.body}</p>
                  </>
                )}
              </div>
            );

            return (
              <div
                key={key}
                className="about-reveal grid grid-cols-1 items-center gap-6 rounded-2xl border border-border bg-surface p-6 shadow-sm md:grid-cols-2 md:p-8"
              >
                {iconColumn}
                {textColumn}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
