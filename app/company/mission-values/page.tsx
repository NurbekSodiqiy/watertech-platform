"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ShieldCheck, Lightbulb, Lock, Target, TrendingUp } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function MissionValuesPage() {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // Desktop/tablet: pinned mask-reveal + parallax, scrubbed to scroll speed
      mm.add("(min-width: 768px)", () => {
        const blocks = gsap.utils.toArray<HTMLElement>(".mv-reveal");

        blocks.forEach((block) => {
          const visual = block.querySelector<HTMLElement>(".mv-visual");

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: block,
              start: "center center",
              end: () => "+=" + Math.round(window.innerHeight * 0.6),
              scrub: true,
              pin: true,
              pinSpacing: true,
            },
          });

          // Mask reveal: opens from the bottom edge upward
          tl.fromTo(
            block,
            { clipPath: "inset(100% 0% 0% 0%)" },
            { clipPath: "inset(0% 0% 0% 0%)", ease: "none" },
            0
          );

          // Parallax: the visual element drifts at a different rate than the text.
          // Small icon badges can safely drift ±30% of their own height; a real
          // image sitting in an overflow-hidden frame needs a much smaller range
          // (set via data-parallax) so it never drifts past its own frame edges.
          if (visual) {
            const range = Number(visual.dataset.parallax) || 30;
            tl.fromTo(visual, { yPercent: -range }, { yPercent: range, ease: "none" }, 0);
          }
        });

        return () => {
          blocks.forEach((block) => gsap.set(block, { clearProps: "clipPath" }));
        };
      });

      // Mobile: lighter fade + parallax only, no pin (avoids janky pinned scroll on small screens)
      mm.add("(max-width: 767px)", () => {
        const blocks = gsap.utils.toArray<HTMLElement>(".mv-reveal");

        blocks.forEach((block) => {
          const visual = block.querySelector<HTMLElement>(".mv-visual");

          gsap.fromTo(
            block,
            { autoAlpha: 0, y: 32 },
            {
              autoAlpha: 1,
              y: 0,
              ease: "none",
              scrollTrigger: {
                trigger: block,
                start: "top 92%",
                end: "top 55%",
                scrub: true,
              },
            }
          );

          if (visual) {
            const range = Math.min(12, Number(visual.dataset.parallax) || 12);
            gsap.fromTo(
              visual,
              { yPercent: -range },
              {
                yPercent: range,
                ease: "none",
                scrollTrigger: {
                  trigger: block,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: true,
                },
              }
            );
          }
        });

        return () => {
          blocks.forEach((block) => gsap.set(block, { clearProps: "all" }));
        };
      });

      // Sequential pinned triggers each add a spacer that shifts every later
      // trigger's position; refresh once after all 6 are registered so the
      // last block's pin/scrub range is measured against final layout.
      ScrollTrigger.refresh();
    }, pageRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={pageRef} className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      {/* Header */}
      <div className="space-y-4">
        <Breadcrumbs path="/company/mission-values" />
        <div>
          <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-primary-dark">Missiya va qadriyatlar</h1>
        </div>
      </div>

      <div className="space-y-8 rounded-2xl border border-border bg-surface p-6 shadow-soft">

        {/* Mission Section */}
        <section>
          <div className="mv-reveal will-change-[clip-path] grid grid-cols-1 items-center gap-6 rounded-2xl border border-border bg-surface-alt p-8 shadow-sm md:grid-cols-2">
            {/* Left column (top on mobile): image frame. overflow-hidden clips the
                parallax drift to this frame so it can never slide over the text column. */}
            {/* TEMPORARY test image (public/products/truba-ppr.jpg) to preview the
                mask-reveal + parallax effect — revert to the dashed placeholder once reviewed */}
            <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-border bg-surface md:h-72">
              <img
                src="/products/truba-ppr.jpg"
                alt=""
                data-parallax="10"
                className="mv-visual absolute inset-x-0 top-[-20%] h-[140%] w-full object-cover"
              />
            </div>

            {/* Right column (bottom on mobile): text, never touched by the image's motion */}
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
        <section>
          <h2 className="mb-5 text-[20px] font-bold text-primary-dark">Vizyon 2030</h2>
          <div className="flex flex-col gap-4">
            <div className="mv-reveal will-change-[clip-path] flex items-start gap-4 rounded-xl border border-border bg-surface-alt p-5">
              <div className="mv-visual flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-surface text-text-secondary">
                <Target size={24} />
              </div>
              <div>
                <span className="mb-2 block text-[24px] font-extrabold leading-none text-primary-dark">2030</span>
                <p className="text-[14px] leading-relaxed text-text-secondary">
                  2030-yilga kelib O'zbekistondagi har 3 ta yangi qurilgan uyda bizning mahsulotimiz o'rnatilgan bo'lishi va MDH davlatlariga eksport hajmini 3 barobar oshirish.
                </p>
              </div>
            </div>

            <div className="mv-reveal will-change-[clip-path] flex items-start gap-4 rounded-xl border border-border bg-surface-alt p-5">
              <div className="mv-visual flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-surface text-text-secondary">
                <TrendingUp size={24} />
              </div>
              <div>
                <span className="mb-2 block text-[24px] font-extrabold leading-none text-primary-dark">№1</span>
                <p className="text-[14px] leading-relaxed text-text-secondary">
                  Markaziy Osiyoda muhandislik santexnikasi bo'yicha №1 ekspert-hamkorga aylanish.
                </p>
              </div>
            </div>
          </div>
        </section>

        <hr className="border-border" />

        {/* Values Section */}
        <section>
          <h2 className="mb-5 text-[20px] font-bold text-primary-dark">Qadriyatlarimiz</h2>
          <div className="flex flex-col gap-4">
            {/* Value 1 */}
            <div className="mv-reveal will-change-[clip-path] flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="mv-visual flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-surface-alt text-text-secondary">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="mb-2 text-[16px] font-bold text-primary-dark">Sifat – bu vijdon</h3>
                <p className="text-[14px] leading-relaxed text-text-secondary">
                  Quvur devorlarining ichida nima borligini mijoz ko'rmaydi, lekin biz bilamiz. Biz nuqsonli mahsulotni chiqarmaymiz.
                </p>
              </div>
            </div>

            {/* Value 2 */}
            <div className="mv-reveal will-change-[clip-path] flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="mv-visual flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-surface-alt text-text-secondary">
                <Lightbulb size={20} />
              </div>
              <div>
                <h3 className="mb-2 text-[16px] font-bold text-primary-dark">Innovatsiya</h3>
                <p className="text-[14px] leading-relaxed text-text-secondary">
                  Biz kechagi texnologiya bilan bugungi bozorni egallay olmaymiz.
                </p>
              </div>
            </div>

            {/* Value 3 */}
            <div className="mv-reveal will-change-[clip-path] flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="mv-visual flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-surface-alt text-text-secondary">
                <Lock size={20} />
              </div>
              <div>
                <h3 className="mb-2 text-[16px] font-bold text-primary-dark">Xavfsizlik</h3>
                <p className="text-[14px] leading-relaxed text-text-secondary">
                  Bizning mahsulotimiz o'rnatilgan joyda suv toshqini bo'lmasligi kerak.
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* Trailing buffer (desktop only): the last pinned block needs scroll
          room past it to finish its scrub — without this, the page's natural
          bottom is reached before the final reveal/parallax completes. */}
      <div className="hidden md:block md:h-[60vh]" aria-hidden="true" />
    </div>
  );
}
