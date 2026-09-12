import { DocPageTemplate } from "@/components/DocPageTemplate";
import { findNode } from "@/lib/site-config";
import { Info, Zap, CheckCircle2 } from "lucide-react";

export default function StageTransitionPage() {
  const path = "/tools/troubleshooting";
  const node = findNode(path);

  const STAGES = [
    {
      num: "01",
      title: "Yangi Lead",
      desc: "Voronkaning eng boshlang'ich qismi. \"Неразобранное\"dan qabul qilingan, o'tkazib yuborilgan (пропущенный) qo'ng'iroqlar va ijtimoiy tarmoqlardan kelgan murojaatlar tushadi.",
      req: "Aloqa o'rnatilgach, albatta keyingi tegishli statusga o'tkazilishi shart."
    },
    {
      num: "02",
      title: "Javob bermadi",
      desc: "Qo'ng'iroqqa javob bermagan leadlar yo'naltiriladi.",
      trigger: "Tizim avtomatik tarzda 4 soatdan keyin \"Qayta aloqaga chiqing\" nomli vazifa (задача) qo'yadi."
    },
    {
      num: "03",
      title: "Ma'lumot berildi",
      desc: "Mahsulot haqida ma'lumot va taklif berilgan leadlar uchun. Mijoz ko'rib chiqqunga qadar ushbu statusda turadi."
    },
    {
      num: "04",
      title: "O'ylab ko'radi",
      desc: "Taklif bilan tanishib, qaror qabul qilish uchun vaqt so'ragan mijozlar."
    },
    {
      num: "05",
      title: "Namuna yuborish",
      desc: "Sinov uchun mahsulot namunasi (obrazets) tayyorlanishi va jo'natilishi kerak bo'lgan bitimlar."
    },
    {
      num: "06",
      title: "Namuna yuborildi",
      desc: "Namuna yuborilgandan so'ng mijoz fikrini bilish uchun ushbu bosqichga o'tkaziladi."
    },
    {
      num: "07",
      title: "Uchrashuv belgilandi",
      desc: "Aniq uchrashuv vaqti tayinlanganda o'tkaziladi.",
      trigger: "Leadni mas'ul xodimga yo'naltiradi."
    },
    {
      num: "08",
      title: "Uchrashuv o'tkazildi",
      desc: "Uchrashuv yakunlangach o'tkaziladi va bitimga uchrashuv natijasi majburiy kiritiladi."
    },
    {
      num: "09",
      title: "Muzokara jarayonida",
      desc: "Narx, to'lov shartlari yoki yetkazib berish muddatlari bo'yicha yakuniy savdolashuv bosqichi."
    },
    {
      num: "10",
      title: "Kelishuvga erishilgan",
      desc: "Kelishuvga erishilgan, buyurtma olinib shartnoma qilingan, lekin mahsulot hali to'liq yetib bormagan bitimlar."
    }
  ];

  return (
    <DocPageTemplate
      path={path}
      title="amoCRM Sotuv voronkasi va bosqichlar reglamenti"
      description={node?.description}
    >
      <div className="space-y-8">
        
        {/* Kirish bloki (Callout) */}
        <div className="flex flex-col sm:flex-row items-start gap-4 rounded-2xl border border-primary/20 bg-primary/10 p-6 shadow-soft">
          <div className="rounded-full bg-surface p-3 text-primary shadow-softer shrink-0">
            <Info size={28} />
          </div>
          <div>
            <p className="text-[15px] leading-relaxed text-text-secondary">
              <strong className="text-primary-dark font-bold">Sotuv voronkasi</strong> — bu sotuv jarayonlarini tushunish, optimallashtirish va nazorat qilish uchun muhim instrument. U potensial leadning dastlabki xabardorligidan to muvaffaqiyatli xarid amaliyotiga qadar bo&apos;lgan yo&apos;lining vizual va tahliliy ifodasidir. Voronkadagi har bir bo&apos;lak <strong className="text-primary-dark font-medium">status</strong> deb ataladi.
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
                  <h4 className="text-[17px] font-bold text-primary-dark mb-2">
                    {stage.title}
                  </h4>
                  <p className="text-[14.5px] leading-relaxed text-text-secondary">
                    {stage.desc}
                  </p>
                  
                  {stage.req && (
                    <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-surface-alt p-3.5 border border-border/50">
                      <CheckCircle2 size={18} className="text-primary mt-0.5 shrink-0" />
                      <p className="text-[13.5px] font-medium text-text-secondary">
                        <span className="text-primary-dark font-bold">Talab:</span> {stage.req}
                      </p>
                    </div>
                  )}

                  {stage.trigger && (
                    <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-primary/10 p-3.5 border border-primary/20">
                      <Zap size={18} className="text-primary mt-0.5 shrink-0" />
                      <p className="text-[13.5px] font-medium text-text-secondary">
                        <span className="text-primary-dark font-bold">Avtomatik trigger:</span> {stage.trigger}
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
