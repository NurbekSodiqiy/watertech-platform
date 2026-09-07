import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CalendarDays, Settings, ShieldCheck, Globe } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      {/* Header */}
      <div className="space-y-4">
        <Breadcrumbs path="/company/about" />
        <div>
          <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-primary-dark">Kompaniya haqida</h1>
        </div>
      </div>

      {/* Quick Facts */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface p-4 text-center shadow-soft">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CalendarDays size={20} />
          </span>
          <span className="text-[13px] font-semibold leading-tight text-primary-dark">2021-yildan buyon</span>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface p-4 text-center shadow-soft">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Settings size={20} />
          </span>
          <span className="text-[13px] font-semibold leading-tight text-primary-dark">Germaniya texnologiyasi</span>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface p-4 text-center shadow-soft">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck size={20} />
          </span>
          <span className="text-[13px] font-semibold leading-tight text-primary-dark">Xalqaro standartlar</span>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface p-4 text-center shadow-soft">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Globe size={20} />
          </span>
          <span className="text-[13px] font-semibold leading-tight text-primary-dark">Xorijga eksport</span>
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-soft">
        
        <section>
          <h2 className="mb-3 text-[18px] font-bold text-primary-dark">Biz haqimizda</h2>
          <p className="text-[15px] leading-relaxed text-text-secondary">
            WATERTECH – bu 2021-yildan buyon O'zbekistonda faoliyat yuritayotgan, kanalizatsiya 
            tizimlari uchun truba va fitinglar ishlab chiqaruvchi mahalliy brenddir. Kompaniyamiz o'z 
            faoliyatini Germaniya texnologiyasi asosida tashkil etgan bo'lib, har bir mahsulotda sifat, 
            ishonchlilik va uzoq muddatli xizmat kafolatini ta'minlaydi.
          </p>
        </section>

        <hr className="border-border" />

        <section>
          <h2 className="mb-3 text-[18px] font-bold text-primary-dark">Ishlab chiqarish</h2>
          <p className="text-[15px] leading-relaxed text-text-secondary">
            Ishlab chiqarish jarayonida biz yuqori sifatli polipropilen xom ashyolaridan foydalanamiz. 
            Natijada WATERTECH truba va fitinglari nafaqat mahalliy bozorda, balki xorijiy bozorlarda 
            ham o'z o'rnini topmoqda.
          </p>
        </section>

        <hr className="border-border" />

        <section>
          <h2 className="mb-3 text-[18px] font-bold text-primary-dark">Maqsadimiz</h2>
          <p className="text-[15px] leading-relaxed text-text-secondary">
            Kompaniyamizning asosiy maqsadi – mijozlarga zamonaviy, chidamli va samarali kanalizatsiya 
            tizimlarini taqdim etishdir. Har bir mahsulot texnik talab va xalqaro standartlarga muvofiq 
            sinovdan o'tkaziladi.
          </p>
        </section>

        <hr className="border-border" />

        <section>
          <h2 className="mb-3 text-[18px] font-bold text-primary-dark">Nega WATERTECH</h2>
          <p className="text-[15px] leading-relaxed text-text-secondary">
            WATERTECH – bu yangilik, texnologiya va ishonch uyg'unlashgan brend. Biz mijozlarimiz bilan 
            uzoq muddatli hamkorlikni qadrlaymiz va har bir loyiha uchun eng optimal yechimlarni taklif 
            etamiz.
          </p>
        </section>

      </div>
    </div>
  );
}
