import { unstable_setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AccentIconVisual } from "@/components/AccentIconVisual";
import { AccentTextPanel } from "@/components/AccentTextPanel";
import { Reveal } from "@/components/ui/Reveal";
import { Parallax } from "@/components/ui/Parallax";
import { CalendarDays, Settings, ShieldCheck, Globe, Factory, Cog, Target, Award, type LucideIcon } from "lucide-react";

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

export default function AboutPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      {/* Header */}
      <div className="space-y-4">
        <Breadcrumbs path="/company/about" />
        <div>
          <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-primary-dark">Kompaniya haqida</h1>
        </div>
      </div>

      {/* Compact badge row (original layout) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {BADGES.map(({ Icon, label }, i) => (
          <Reveal key={label} delay={i * 0.08}>
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface p-4 text-center shadow-soft">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent/[0.08] text-accent dark:bg-accent/[0.12]">
                <Icon size={20} />
              </span>
              <span className="text-[13px] font-semibold leading-tight text-primary-dark">{label}</span>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Paragraph sections: zigzag two-column blocks */}
      <div className="space-y-8 rounded-2xl border border-border bg-surface p-6 shadow-soft">
        {SECTIONS.map(({ Icon, title, body }, i) => {
          const iconLeft = i % 2 === 0;

          const iconColumn = (
            <Parallax rangePx={20} className={iconLeft ? "" : "md:order-2"}>
              <AccentIconVisual icon={Icon} />
            </Parallax>
          );

          const textColumn = (
            <AccentTextPanel className={iconLeft ? "" : "md:order-1"}>
              <h2 className="mb-3 text-[18px] font-bold text-on-accent">{title}</h2>
              <p className="text-[15px] leading-relaxed text-on-accent/80">{body}</p>
            </AccentTextPanel>
          );

          return (
            <Reveal
              key={title}
              className="grid grid-cols-1 items-stretch overflow-hidden rounded-2xl border border-border shadow-sm md:grid-cols-2"
            >
              {iconColumn}
              {textColumn}
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
