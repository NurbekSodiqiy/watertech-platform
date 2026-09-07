import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ShieldCheck, Lightbulb, Lock, Target, TrendingUp } from "lucide-react";

export default function MissionValuesPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      {/* Header */}
      <div className="space-y-4">
        <Breadcrumbs path="/company/mission-values" />
        <div>
          <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-primary-dark">Missiya va qadriyatlar</h1>
        </div>
      </div>

      <div className="space-y-8 rounded-2xl border border-border bg-surface p-6 shadow-soft">
        
        {/* Mission Section */}
        <section className="text-center rounded-2xl border border-border bg-surface-alt p-8 shadow-sm">
          <h2 className="mb-4 text-[20px] font-bold text-primary-dark uppercase tracking-wider">Missiya</h2>
          <p className="mb-3 text-[18px] font-medium leading-relaxed text-primary md:text-[22px]">
            "Odamlar uylarida xotirjam yashashlari uchun ishonchli va uzoq xizmat qiladigan suv tizimlarini yaratish."
          </p>
          <p className="text-[15px] italic text-text-secondary">
            Suv hayot manbai, biz esa uning xavfsiz oqimini ta'minlaymiz.
          </p>
        </section>

        {/* Vision Section */}
        <section>
          <h2 className="mb-5 text-[20px] font-bold text-primary-dark">Vizyon 2030</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-4 rounded-xl border border-border bg-surface-alt p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Target size={24} />
              </div>
              <div>
                <span className="mb-2 block text-[24px] font-extrabold leading-none text-primary-dark">2030</span>
                <p className="text-[14px] leading-relaxed text-text-secondary">
                  2030-yilga kelib O'zbekistondagi har 3 ta yangi qurilgan uyda bizning mahsulotimiz o'rnatilgan bo'lishi va MDH davlatlariga eksport hajmini 3 barobar oshirish.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 rounded-xl border border-border bg-surface-alt p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
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
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Value 1 */}
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
    </div>
  );
}
