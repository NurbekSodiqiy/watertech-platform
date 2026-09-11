"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AccentIconVisual } from "@/components/AccentIconVisual";
import { AccentTextPanel } from "@/components/AccentTextPanel";
import { CalendarDays, Settings, ShieldCheck, Globe, Factory, Cog, Target, Award, type LucideIcon } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const BADGES = [
  { Icon: CalendarDays, label: "2021-yildan buyon" },
  { Icon: Settings, label: "Germaniya texnologiyasi" },
  { Icon: ShieldCheck, label: "Xalqaro standartlar" },
  { Icon: Globe, label: "Xorijga eksport" },
];

// Odd sections (1st, 3rd): icon left, text right. Even sections (2nd, 4th):
// text left, icon right — zigzag convention shared with /company/mission-values.
const SECTIONS: { Icon: LucideIcon; title: string; body: string }[] = [
  {
    Icon: Factory,
    title: "Biz haqimizda",
    body: "WATERTECH – bu 2021-yildan buyon O'zbekistonda faoliyat yuritayotgan, kanalizatsiya tizimlari uchun truba va fitinglar ishlab chiqaruvchi mahalliy brenddir. Kompaniyamiz o'z faoliyatini Germaniya texnologiyasi asosida tashkil etgan bo'lib, har bir mahsulotda sifat, ishonchlilik va uzoq muddatli xizmat kafolatini ta'minlaydi.",
  },
  {
    Icon: Cog,
    title: "Ishlab chiqarish",
    body: "Ishlab chiqarish jarayonida biz yuqori sifatli polipropilen xom ashyolaridan foydalanamiz. Natijada WATERTECH truba va fitinglari nafaqat mahalliy bozorda, balki xorijiy bozorlarda ham o'z o'rnini topmoqda.",
  },
  {
    Icon: Target,
    title: "Maqsadimiz",
    body: "Kompaniyamizning asosiy maqsadi – mijozlarga zamonaviy, chidamli va samarali kanalizatsiya tizimlarini taqdim etishdir. Har bir mahsulot texnik talab va xalqaro standartlarga muvofiq sinovdan o'tkaziladi.",
  },
  {
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

        {/* Compact badge row (original layout) */}
        <div className="about-badges-row grid grid-cols-2 gap-3 sm:grid-cols-4">
          {BADGES.map(({ Icon, label }) => (
            <div
              key={label}
              className="about-badge-item flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface p-4 text-center shadow-soft"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent/[0.08] text-accent dark:bg-accent/[0.12]">
                <Icon size={20} />
              </span>
              <span className="text-[13px] font-semibold leading-tight text-primary-dark">{label}</span>
            </div>
          ))}
        </div>

        {/* Paragraph sections: zigzag two-column blocks */}
        <div className="space-y-8 rounded-2xl border border-border bg-surface p-6 shadow-soft">
          {SECTIONS.map(({ Icon, title, body }, i) => {
            const iconLeft = i % 2 === 0;

            const iconColumn = (
              <AccentIconVisual
                icon={Icon}
                visualClassName="about-visual"
                dataParallax={20}
                className={iconLeft ? "" : "md:order-2"}
              />
            );

            const textColumn = (
              <AccentTextPanel className={iconLeft ? "" : "md:order-1"}>
                <h2 className="mb-3 text-[18px] font-bold text-white">{title}</h2>
                <p className="text-[15px] leading-relaxed text-white/80">{body}</p>
              </AccentTextPanel>
            );

            return (
              <div
                key={title}
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
