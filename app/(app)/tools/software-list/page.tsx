import { DocPageTemplate } from "@/components/DocPageTemplate";
import { findNode } from "@/lib/site-config";
import { Info, Zap, RefreshCw, XCircle } from "lucide-react";

export default function RepeatSalesPage() {
  const path = "/tools/software-list";
  const node = findNode(path);

  const STAGES = [
    {
      num: "01",
      title: "Mijoz (Boshlang'ich status)",
      desc: "Asosiy voronkada birinchi xaridni amalga oshirgan barcha mijozlar uchun tizim avtomatik ravishda ushbu voronkada yangi bitim (сделка) ochadi.",
      trigger: "Mas'ul xodimga \"Qayta sotuv qilish uchun aloqaga chiqing\" nomli vazifa (задача) belgilanadi."
    },
    {
      num: "02",
      title: "Taklif yuborilgan",
      desc: "Mijoz bilan aloqaga chiqilib, uning ehtiyojiga qarab yangi tijorat taklifi (KP) yoki yangilangan narxlar yuborilgach o'tkaziladi."
    },
    {
      num: "03",
      title: "Muzokara jarayoni",
      desc: "Mijoz ma'lum bir muddatdan so'ng bog'lanishni so'ragan yoki hajm, chegirma va to'lov shartlari bo'yicha muzokara ketayotgan bo'lsa yo'naltiriladi."
    },
    {
      num: "04",
      title: "Kelishuvga erishilgan",
      desc: "Yangi buyurtmaga kelishilgan, shartnoma tuzilgan, lekin tovar hali yetkazib berilmagan holat."
    },
    {
      num: "05",
      title: "Qayta sotuv bo'ldi (Muvaffaqiyatli yakun)",
      desc: "Qayta sotuv to'liq amalga oshirilib, to'lov qabul qilingan bitimlar.",
      cyclic: "10 kundan so'ng tizim avtomatik tarzda \"Mijoz\" statusida ushbu mijoz uchun yangi navbatdagi bitimni (сделка) ochadi."
    },
    {
      num: "06",
      title: "Qayta sotuv bo'lmadi (Yopilgan / Rad)",
      desc: "Hozirgi bosqichda takroriy xaridni rad etgan yoki ma'lum sabablarga ko'ra sotuv amalga oshmagan bitimlar (sababini majburiy qayd etgan holda).",
      fail: true
    }
  ];

  return (
    <DocPageTemplate
      path={path}
      title="Qayta sotuv voronkasi reglamenti"
      description="Mavjud mijozlar bilan qayta aloqa, yangi buyurtmalar olish va avtomatik triggerlar orqali uzluksiz savdoni ta'minlash yo'riqnomasi."
    >
      <div className="space-y-8">
        
        {/* Kirish bloki (Callout) */}
        <div className="flex flex-col sm:flex-row items-start gap-4 rounded-2xl border border-primary/20 bg-primary/10 p-6 shadow-soft">
          <div className="rounded-full bg-surface p-3 text-primary shadow-softer shrink-0">
            <Info size={28} />
          </div>
          <div>
            <p className="text-[15px] leading-relaxed text-text-secondary">
              <strong className="text-primary-dark font-bold">Qayta sotuv voronkasi</strong> — birinchi marta xarid qilgan mijozlarni doimiy hamkorga aylantirish, mahsulot qoldiqlarini o'z vaqtida to'ldirish va takroriy buyurtmalarni avtomatlashtirish tizimi.
            </p>
          </div>
        </div>

        {/* Voronka bosqichlari */}
        <div className="space-y-6">
          <h3 className="text-[18px] font-bold text-primary-dark border-b border-border pb-3">
            Voronka bosqichlari (Statuslar)
          </h3>
          
          <div className="flex flex-col gap-5 relative">
            {/* Chiziq - visual pipeline effect */}
            <div className="absolute left-6 top-8 bottom-8 w-[2px] bg-border hidden sm:block"></div>

            {STAGES.map((stage) => (
              <div key={stage.num} className="relative flex flex-col sm:flex-row gap-4 sm:gap-6 group">
                
                {/* Number Badge */}
                <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-surface bg-surface-alt font-mono text-[16px] font-bold text-primary-dark shadow-soft transition-colors group-hover:border-primary group-hover:bg-primary/10">
                  {stage.num}
                </div>

                {/* Content Card */}
                <div className="flex-1 rounded-2xl border border-border bg-surface p-5 shadow-soft transition-all hover:border-primary/30 hover:shadow-elevated">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h4 className="text-[17px] font-bold text-primary-dark">
                      {stage.title}
                    </h4>
                    {stage.fail && (
                      <XCircle size={20} className="text-text-secondary shrink-0" />
                    )}
                  </div>
                  <p className="text-[14.5px] leading-relaxed text-text-secondary">
                    {stage.desc}
                  </p>

                  {stage.trigger && (
                    <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-primary/10 p-3.5 border border-primary/20">
                      <Zap size={18} className="text-primary mt-0.5 shrink-0" />
                      <p className="text-[13.5px] font-medium text-text-secondary">
                        <span className="text-primary-dark font-bold">Avtomatik trigger:</span> {stage.trigger}
                      </p>
                    </div>
                  )}

                  {stage.cyclic && (
                    <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-surface-alt p-3.5 border border-border/50">
                      <RefreshCw size={18} className="text-primary mt-0.5 shrink-0" />
                      <p className="text-[13.5px] font-medium text-text-secondary">
                        <span className="text-primary-dark font-bold">Siklik avtomatik trigger:</span> {stage.cyclic}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </DocPageTemplate>
  );
}
