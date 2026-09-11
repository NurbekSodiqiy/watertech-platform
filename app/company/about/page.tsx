"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CalendarDays, Settings, ShieldCheck, Globe } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const BADGES = [
  { Icon: CalendarDays, label: "2021-yildan buyon" },
  { Icon: Settings, label: "Germaniya texnologiyasi" },
  { Icon: ShieldCheck, label: "Xalqaro standartlar" },
  { Icon: Globe, label: "Xorijga eksport" },
];

const SECTIONS = [
  {
    title: "Biz haqimizda",
    body: "WATERTECH – bu 2021-yildan buyon O'zbekistonda faoliyat yuritayotgan, kanalizatsiya tizimlari uchun truba va fitinglar ishlab chiqaruvchi mahalliy brenddir. Kompaniyamiz o'z faoliyatini Germaniya texnologiyasi asosida tashkil etgan bo'lib, har bir mahsulotda sifat, ishonchlilik va uzoq muddatli xizmat kafolatini ta'minlaydi.",
  },
  {
    title: "Ishlab chiqarish",
    body: "Ishlab chiqarish jarayonida biz yuqori sifatli polipropilen xom ashyolaridan foydalanamiz. Natijada WATERTECH truba va fitinglari nafaqat mahalliy bozorda, balki xorijiy bozorlarda ham o'z o'rnini topmoqda.",
  },
  {
    title: "Maqsadimiz",
    body: "Kompaniyamizning asosiy maqsadi – mijozlarga zamonaviy, chidamli va samarali kanalizatsiya tizimlarini taqdim etishdir. Har bir mahsulot texnik talab va xalqaro standartlarga muvofiq sinovdan o'tkaziladi.",
  },
  {
    title: "Nega WATERTECH",
    body: "WATERTECH – bu yangilik, texnologiya va ishonch uyg'unlashgan brend. Biz mijozlarimiz bilan uzoq muddatli hamkorlikni qadrlaymiz va har bir loyiha uchun eng optimal yechimlarni taklif etamiz.",
  },
];

export default function AboutPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  // Same containment pattern already validated on /company/mission-values:
  // the horizontal pin section below adds a large amount of *vertical*
  // scroll distance (GSAP inserts a pin-spacer sized to the horizontal
  // travel distance). Left on the shared document, that would stretch the
  // AppShell sidebar (which isn't sticky, and stretches to match the
  // tallest column) far past its own real height. Scrolling this page
  // inside its own bounded element keeps that height fully local.
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pinWrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  // Since this pin section is the last content on the page, the browser can
  // only scroll as far as "everything after the pin release point" allows —
  // and that's just this wrapper's own (small) natural height. If the
  // scroller's viewport is taller than that, there's nowhere left to scroll
  // to reach the pin's release point, and the horizontal travel stops short.
  // Sized exactly (viewport height minus the wrapper's own height) so the
  // pin can always fully release, with nothing left over as visible empty
  // space beyond that.
  const trailingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollerRef.current || !pinWrapperRef.current || !trackRef.current || !trailingRef.current) return;
    const scroller: HTMLDivElement = scrollerRef.current;
    const wrapper: HTMLDivElement = pinWrapperRef.current;
    const track: HTMLDivElement = trackRef.current;
    const trailing: HTMLDivElement = trailingRef.current;

    const ctx = gsap.context(() => {
      // Two separate string-query matchMedia calls — an object-conditions
      // call only fires when at least one of its named queries currently
      // matches, so a single call keyed on one breakpoint silently never
      // runs on the other (bit us once already on the mission-values page).
      const mm = gsap.matchMedia();

      mm.add("(min-width: 768px)", () => {
        const travel = () => Math.max(0, track.scrollWidth - wrapper.clientWidth);

        function sizeTrailing() {
          const needed = Math.max(0, scroller.clientHeight - wrapper.getBoundingClientRect().height);
          trailing.style.height = needed + "px";
        }
        sizeTrailing();

        const tween = gsap.to(track, {
          x: () => -travel(),
          ease: "none",
          scrollTrigger: {
            trigger: wrapper,
            scroller,
            start: "top top",
            end: () => "+=" + travel(),
            pin: true,
            scrub: true,
            invalidateOnRefresh: true,
          },
        });

        function onResize() {
          sizeTrailing();
          ScrollTrigger.refresh();
        }
        window.addEventListener("resize", onResize);

        return () => {
          window.removeEventListener("resize", onResize);
          tween.scrollTrigger?.kill();
          tween.kill();
          gsap.set(track, { clearProps: "transform" });
          trailing.style.height = "0px";
        };
      });

      mm.add("(max-width: 767px)", () => {
        const items = gsap.utils.toArray<HTMLElement>(".about-mobile-item");
        items.forEach((item) => {
          gsap.fromTo(
            item,
            { autoAlpha: 0, y: 20 },
            {
              autoAlpha: 1,
              y: 0,
              ease: "none",
              scrollTrigger: {
                trigger: item,
                scroller,
                start: "top 90%",
                end: "top 60%",
                scrub: true,
              },
            }
          );
        });

        return () => {
          items.forEach((item) => gsap.set(item, { clearProps: "all" }));
        };
      });

      ScrollTrigger.refresh();

      // Card widths depend on web-font metrics. If fonts finish loading
      // after this first refresh, the track's real scrollWidth can grow —
      // refresh again once fonts have settled so the pin's spacer height
      // (sized from the first measurement) matches the final layout the
      // live tween scrolls through.
      if (typeof document !== "undefined" && "fonts" in document) {
        document.fonts.ready.then(() => ScrollTrigger.refresh());
      }
    }, pageRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={scrollerRef} className="about-scroll-hide h-[calc(100vh-3.5rem)] overflow-y-auto">
      {/* This container scrolls (it hosts the GSAP ScrollTrigger scroller and
          keeps the pin section's extra height off the shared page/sidebar
          layout) — only its own visual scrollbar is hidden, so the page
          still shows just the one (window) scrollbar the rest of the site
          uses. */}
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

        {/* Desktop/tablet: horizontal pin-scroll strip */}
        <div className="hidden md:block">
          <div
            ref={pinWrapperRef}
            className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft"
          >
            <div ref={trackRef} className="flex items-stretch gap-6 p-6">
              {BADGES.map(({ Icon, label }) => (
                <div
                  key={label}
                  className="flex h-72 w-56 shrink-0 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-surface-alt p-6 text-center shadow-sm"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon size={24} />
                  </span>
                  <span className="text-[14px] font-semibold leading-tight text-primary-dark">{label}</span>
                </div>
              ))}

              {SECTIONS.map(({ title, body }) => (
                <div
                  key={title}
                  className="flex h-72 w-[420px] shrink-0 flex-col justify-center gap-3 rounded-2xl border border-border bg-surface-alt p-6 shadow-sm"
                >
                  <h2 className="text-[18px] font-bold text-primary-dark">{title}</h2>
                  <p className="text-[15px] leading-relaxed text-text-secondary">{body}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Sized in JS to exactly close the "nowhere left to scroll" gap
              described above — height is 0 whenever it isn't needed. */}
          <div ref={trailingRef} aria-hidden="true" />
        </div>

        {/* Mobile: plain vertical list, fade-in on scroll, no pin */}
        <div className="space-y-6 md:hidden">
          <div className="about-mobile-item grid grid-cols-2 gap-3">
            {BADGES.map(({ Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface p-4 text-center shadow-soft"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon size={20} />
                </span>
                <span className="text-[13px] font-semibold leading-tight text-primary-dark">{label}</span>
              </div>
            ))}
          </div>

          <div className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-soft">
            {SECTIONS.map(({ title, body }, i) => (
              <div key={title} className="about-mobile-item">
                {i > 0 && <hr className="mb-6 border-border" />}
                <h2 className="mb-3 text-[18px] font-bold text-primary-dark">{title}</h2>
                <p className="text-[15px] leading-relaxed text-text-secondary">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
