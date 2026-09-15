import { unstable_setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AccentIconVisual } from "@/components/AccentIconVisual";
import { AccentTextPanel } from "@/components/AccentTextPanel";
import { Reveal } from "@/components/ui/Reveal";
import { Parallax } from "@/components/ui/Parallax";

// Icons are inlined (stroke="currentColor") rather than referenced via
// <img src>, because currentColor in an externally-loaded SVG resolves
// inside that SVG's own isolated document — it can't see this page's CSS —
// so <img> would just render black in both themes. Inlining lets `text-accent`
// on the wrapping badge flow into the stroke via normal color inheritance.
function MissiyaIcon({ size = 40 }: { size?: number | string }) {
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

function Vizyon2030Icon({ size = 40 }: { size?: number | string }) {
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

function No1Icon({ size = 40 }: { size?: number | string }) {
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

function SifatIcon({ size = 40 }: { size?: number | string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24,3 L4,12 L4,24 Q4,38 24,45 Q44,38 44,24 L44,12 Z" />
        <path d="M14,24 L21,31 L35,15" />
      </g>
    </svg>
  );
}

function InnovatsiyaIcon({ size = 40 }: { size?: number | string }) {
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

function XavfsizlikIcon({ size = 40 }: { size?: number | string }) {
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

export default function MissionValuesPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
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
          <Reveal className="grid grid-cols-1 items-stretch overflow-hidden rounded-2xl border border-border shadow-sm md:grid-cols-2">
            <Parallax rangePx={10}>
              <AccentIconVisual icon={MissiyaIcon} />
            </Parallax>
            <AccentTextPanel>
              <h2 className="mb-4 text-[20px] font-bold uppercase tracking-wider text-white">Missiya</h2>
              <p className="mb-3 text-[18px] font-medium leading-relaxed text-white md:text-[22px]">
                &quot;Odamlar uylarida xotirjam yashashlari uchun ishonchli va uzoq xizmat qiladigan suv tizimlarini yaratish.&quot;
              </p>
              <p className="text-[15px] italic text-white/80">
                Suv hayot manbai, biz esa uning xavfsiz oqimini ta&apos;minlaymiz.
              </p>
            </AccentTextPanel>
          </Reveal>
        </section>

        {/* Vision Section */}
        <section className="space-y-8">
          <h2 className="text-[20px] font-bold text-primary-dark">Vizyon 2030</h2>

          {/* "2030" — text left, image right */}
          <Reveal className="grid grid-cols-1 items-stretch overflow-hidden rounded-2xl border border-border shadow-sm md:grid-cols-2">
            <AccentTextPanel className="md:order-1">
              <span className="mx-auto mb-2 block h-1 w-9 rounded-full bg-white md:mx-0" />
              <span className="mb-2 block text-[28px] font-extrabold leading-none text-white">2030</span>
              <p className="text-[14px] leading-relaxed text-white/80">
                2030-yilga kelib O&apos;zbekistondagi har 3 ta yangi qurilgan uyda bizning mahsulotimiz o&apos;rnatilgan bo&apos;lishi va MDH davlatlariga eksport hajmini 3 barobar oshirish.
              </p>
            </AccentTextPanel>
            <Parallax rangePx={10} className="md:order-2">
              <AccentIconVisual icon={Vizyon2030Icon} />
            </Parallax>
          </Reveal>

          {/* "№1" — image left, text right */}
          <Reveal className="grid grid-cols-1 items-stretch overflow-hidden rounded-2xl border border-border shadow-sm md:grid-cols-2">
            <Parallax rangePx={10}>
              <AccentIconVisual icon={No1Icon} />
            </Parallax>
            <AccentTextPanel>
              <span className="mx-auto mb-2 block h-1 w-9 rounded-full bg-white md:mx-0" />
              <span className="mb-2 block text-[28px] font-extrabold leading-none text-white">№1</span>
              <p className="text-[14px] leading-relaxed text-white/80">
                Markaziy Osiyoda muhandislik santexnikasi bo&apos;yicha №1 ekspert-hamkorga aylanish.
              </p>
            </AccentTextPanel>
          </Reveal>
        </section>

        {/* Values Section */}
        <section className="space-y-8">
          <h2 className="text-[20px] font-bold text-primary-dark">Qadriyatlarimiz</h2>

          {/* Sifat — text left, image right */}
          <Reveal className="grid grid-cols-1 items-stretch overflow-hidden rounded-2xl border border-border shadow-sm md:grid-cols-2">
            <AccentTextPanel className="md:order-1">
              <h3 className="mb-2 text-[16px] font-bold text-white">Sifat – bu vijdon</h3>
              <p className="text-[14px] leading-relaxed text-white/80">
                Quvur devorlarining ichida nima borligini mijoz ko&apos;rmaydi, lekin biz bilamiz. Biz nuqsonli mahsulotni chiqarmaymiz.
              </p>
            </AccentTextPanel>
            <Parallax rangePx={10} className="md:order-2">
              <AccentIconVisual icon={SifatIcon} />
            </Parallax>
          </Reveal>

          {/* Innovatsiya — image left, text right */}
          <Reveal className="grid grid-cols-1 items-stretch overflow-hidden rounded-2xl border border-border shadow-sm md:grid-cols-2">
            <Parallax rangePx={10}>
              <AccentIconVisual icon={InnovatsiyaIcon} />
            </Parallax>
            <AccentTextPanel>
              <h3 className="mb-2 text-[16px] font-bold text-white">Innovatsiya</h3>
              <p className="text-[14px] leading-relaxed text-white/80">
                Biz kechagi texnologiya bilan bugungi bozorni egallay olmaymiz.
              </p>
            </AccentTextPanel>
          </Reveal>

          {/* Xavfsizlik — text left, image right */}
          <Reveal className="grid grid-cols-1 items-stretch overflow-hidden rounded-2xl border border-border shadow-sm md:grid-cols-2">
            <AccentTextPanel className="md:order-1">
              <h3 className="mb-2 text-[16px] font-bold text-white">Xavfsizlik</h3>
              <p className="text-[14px] leading-relaxed text-white/80">
                Bizning mahsulotimiz o&apos;rnatilgan joyda suv toshqini bo&apos;lmasligi kerak.
              </p>
            </AccentTextPanel>
            <Parallax rangePx={10} className="md:order-2">
              <AccentIconVisual icon={XavfsizlikIcon} />
            </Parallax>
          </Reveal>
        </section>

      </div>
    </div>
  );
}
