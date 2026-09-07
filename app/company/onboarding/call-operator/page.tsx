"use client";

import { useState } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ChevronDown, Calendar } from "lucide-react";

export default function CallOperatorOnboardingPage() {
  const [openDay, setOpenDay] = useState<number | null>(1);

  const toggleDay = (day: number) => {
    setOpenDay(openDay === day ? null : day);
  };

  const days = [
    {
      day: 1,
      title: "Biz haqimizda va mahsulot",
      objective: "Kompaniyaning \"DNK\"sini tushunish va o'z o'rnini anglash.",
      items: [
        "Kompaniya haqida ma'lumot",
        "Watertech'ning bozordagi o'rni: biz kimmiz va nima qilamiz?",
        "Asosiy 3 ta mahsulotimizning qiymat taklifi (Value Proposition).",
        "Eng asosiy raqobatchimiz va bizning undan farqimiz.",
        "Jamoa bilan tushlik.",
        "Mahsulot katalogi bilan tanishuv",
        "Kompaniyaning operatorlari bilan suhbat. Ularning muvaffaqiyat sirlari, eng katta xatolari va amaliy maslahatlari."
      ]
    },
    {
      day: 2,
      title: "Mahsulotni o'rganishga sho'ng'ish",
      objective: "Mahsulotni shunday o'rganishki, uni mijozga ishonch bilan sota olsin.",
      items: [
        "<strong>\"Injener bilan suhbat\"</strong> Yetakchi texnik mutaxassis bilan amaliy sessiya.",
        "Mahsulotlarning ishlash prinsipini jonli ko'rish (demo-stendda).",
        "Mijozlar duch keladigan eng keng tarqalgan 5 ta texnik muammo va ularning yechimi.",
        "Call operator bilishi shart bo'lgan eng muhim texnik parametrlar.",
        "14:00 - 17:00: <strong>\"Raqobatchini \"yanchib tashlash\"\"</strong>. Raqobatchilarning mahsulotlari bilan biznikini yonma-yon taqqoslash. Mijozning e'tirozlariga tayyorlanish (\"Sizlarniki qimmat\", \"Raqobatchingizda bu funksiya bor\")."
      ]
    },
    {
      day: 3,
      title: "Mijoz va CRM",
      objective: "Ideal mijoz kimligini anglash va u bilan ishlash qurollarini o'zlashtirish.",
      items: [
        "<strong>\"Ideal mijoz portreti\"</strong>. CRM tizimini tahlil qilish.",
        "CRM videodarsliklarini ko'rib chiqish",
        "Eng daromadli 5 ta mijozning tarixini o'rganish: ular qanday kelgan, nima sotib olgan, qanday muammosi hal bo'lgan?",
        "12:00 - 13:00: Tushlik.",
        "14:00 - 17:00: <strong>\"Jonli efir\"</strong>. Tajribali operatorning mijoz bilan bo'layotgan jonli suhbatini (telefon yoki uchrashuv) kuzatish. Suhbatdan so'ng 30 daqiqalik \"tahlil\" sessiyasi: nima yaxshi bo'ldi, nimani boshqacha qilish mumkin edi?"
      ]
    },
    {
      day: 4,
      title: "Savdo Qurollari va Amaliyot",
      objective: "Bilimlarni amaliy ko'nikmaga aylantirish.",
      items: [
        "<strong>\"Menejerning \"chemodani\"\"</strong>. Savdo jarayonida ishlatiladigan barcha andoza va materiallarni o'rganish: tijorat taklifi (KP), shartnoma, taqdimot sladi, marketing materiallari.",
        "Tushlik.",
        "Standartlar bilan tanishish",
        "<strong>\"Jang maydonida repetitsiya\"</strong>. Savdo Direktori bilan \"role-play\" (rolli o'yin).",
        "Potensial mijoz bilan ilk qo'ng'iroq va uchrashuv simulyatsiyasi.",
        "Konstruktiv fikr-mulohazalar olish."
      ]
    }
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div className="space-y-4">
        <Breadcrumbs path="/company/onboarding/call-operator" />
        <div>
          <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-primary-dark">Call operator 4 kunlik dasturi</h1>
        </div>
      </div>

      <div className="space-y-4">
        {days.map((dayData) => {
          const isOpen = openDay === dayData.day;
          return (
            <div key={dayData.day} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
              <button
                onClick={() => toggleDay(dayData.day)}
                className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-surface-alt"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h2 className="text-[16px] font-bold text-primary-dark">
                      {dayData.day}-kun: {dayData.title}
                    </h2>
                  </div>
                </div>
                <ChevronDown
                  size={20}
                  className={`text-text-secondary transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isOpen && (
                <div className="border-t border-border bg-surface-alt p-6">
                  <p className="mb-4 text-[15px] text-primary-dark">
                    <strong>Maqsad:</strong> {dayData.objective}
                  </p>
                  <ul className="space-y-2.5">
                    {dayData.items.map((item, idx) => (
                      <li key={idx} className="flex gap-2.5 text-[14.5px] leading-relaxed text-text-secondary">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        <span dangerouslySetInnerHTML={{ __html: item }} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
