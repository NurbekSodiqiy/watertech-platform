"use client";

import { useState, useEffect } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Lightbulb, CheckSquare, Square, ChevronDown, Calendar } from "lucide-react";
import { useTrack } from "@/hooks/useTrack";

const DAYS = [
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

export default function OnboardingPage() {
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const [openDay, setOpenDay] = useState<number | null>(1);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("onboarding_checklist");
    if (saved) {
      try {
        setCheckedItems(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const track = useTrack();
  const toggleCheck = (index: number) => {
    const newChecked = { ...checkedItems, [index]: !checkedItems[index] };
    setCheckedItems(newChecked);
    localStorage.setItem("onboarding_checklist", JSON.stringify(newChecked));
    track("checklist_toggle", { entityType: "onboarding_item", entityId: String(index), meta: { checked: newChecked[index] } });
  };

  const toggleDay = (day: number) => {
    setOpenDay(openDay === day ? null : day);
  };

  const checklist = [
    "1-kun: Kompaniya missiyasi va qadriyatlarini o'qish.",
    "2-kun: Jamoa bilan tanishish (Kontaktlar bo'limi).",
    "3-kun: Mahsulot turlarini yodlash (Katalog).",
    "4-kun: Skriptlarni o'rganish va imtihon topshirish."
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      {/* Header */}
      <div className="space-y-4">
        <Breadcrumbs path="/company/onboarding" />
        <div>
          <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-primary-dark">Onboarding</h1>
        </div>
      </div>

      <div className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-soft">

        {/* Intro Message */}
        <div className="flex items-start gap-3 rounded-xl border border-accent/20 bg-accent/5 p-4 text-accent">
          <Lightbulb className="mt-0.5 shrink-0" size={20} />
          <p className="text-[15px] leading-relaxed">
            <strong>Xush kelibsiz!</strong> Ushbu 4 kunlik rejani bajaring va jamoamizning to&apos;laqonli a&apos;zosiga aylaning.
          </p>
        </div>

        {/* Checklist */}
        <section>
          <h2 className="mb-4 text-[18px] font-bold text-primary-dark">4 kunlik checklist</h2>
          {mounted ? (
            <div className="space-y-2">
              {checklist.map((item, i) => {
                const isChecked = !!checkedItems[i];
                return (
                  <button
                    key={i}
                    onClick={() => toggleCheck(i)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                      isChecked
                        ? "border-status-ok bg-status-ok/5 text-text-secondary"
                        : "border-border bg-surface-alt hover:border-accent hover:bg-accent/5"
                    }`}
                  >
                    <span className={`shrink-0 ${isChecked ? "text-status-ok" : "text-text-secondary/50"}`}>
                      {isChecked ? <CheckSquare size={20} /> : <Square size={20} />}
                    </span>
                    <span className={`text-[15px] ${isChecked ? "line-through opacity-70" : "font-medium text-primary-dark"}`}>
                      {item}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="h-[200px] animate-pulse rounded-xl bg-surface-alt" />
          )}
        </section>

        <hr className="border-border" />

        {/* Call operator 4-day program — merged in from the former /company/onboarding/call-operator page */}
        <section className="space-y-4">
          {DAYS.map((dayData) => {
            const isOpen = openDay === dayData.day;
            return (
              <div key={dayData.day} className="overflow-hidden rounded-2xl border border-border shadow-soft">
                <button
                  onClick={() => toggleDay(dayData.day)}
                  className="flex w-full items-stretch text-left"
                >
                  <div className="flex shrink-0 items-center justify-center bg-surface px-5 py-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <Calendar size={20} />
                    </div>
                  </div>
                  <div className="flex flex-1 items-center justify-between gap-4 bg-accent px-5 py-5 transition-colors hover:bg-accent-hover">
                    <h2 className="text-[16px] font-bold text-white">
                      {dayData.day}-kun: {dayData.title}
                    </h2>
                    <ChevronDown
                      size={20}
                      className={`shrink-0 text-white transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </div>
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
        </section>

      </div>
    </div>
  );
}
