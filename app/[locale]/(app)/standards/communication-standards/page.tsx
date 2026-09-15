import { unstable_setRequestLocale } from "next-intl/server";
import { DocPageTemplate } from "@/components/DocPageTemplate";
import { findNode } from "@/lib/site-config";

interface Rule {
  num: string;
  title: string;
  notes: string[];
}

// Numbered-rule-card style reused verbatim from /tools/sales-funnel's
// STAGES list (number badge + connecting line + content card) — same
// component structure, just rule content instead of funnel stages.
const RULES: Rule[] = [
  {
    num: "01",
    title: "Mijozlarga professional muloqot qo'ng'irog'ini amalga oshirish",
    notes: ["Har bir mijoz bilan iliq, e'tiborli va aniq muloqot qilish zarur. Mijoz o'zini qadrli his qilishi kerak."],
  },
  {
    num: "02",
    title: "CRM tizimida real vaqt rejimida ishlash",
    notes: ["Har bir lid ustida ish boshlaganda va tugatganda CRM'da statusni yangilash kerak."],
  },
  {
    num: "03",
    title: "Yangi leadlarga agar javob bermasa, 5 kun davomida har kuni lidga 2 marta qo'ng'iroq qilish",
    notes: [
      "Mijoz sovib ketmasligi uchun 1 kun ichida 2 marotaba aloqa qilish kerak.",
      "Lid kiritilgach: 1-qo'ng'iroq 10:00–12:00 da, 2-qo'ng'iroq 15:00–17:00 amalga oshiriladi.",
    ],
  },
  {
    num: "04",
    title: "Kunlik minimal 40 ta qo'ng'iroq bajarish",
    notes: ["Kunlik muloqot hajmi kamida 40 ta bo'lishi zarur, shunda ko'proq sotuv imkoniyati yaratiladi."],
  },
  {
    num: "05",
    title: "Skriptlar asosida, lekin jonli muloqotda ishlash",
    notes: ["Mijozni sun'iy gaplar bilan zeriktirmaslik, ssenariyni jonlantirib gapirish."],
  },
  {
    num: "06",
    title: "Mijoz shikoyatlarini imkon qadar telefon orqali ijobiy hal qilish",
    notes: ["Mijoz bilan bahslashmasdan, muammoni eshitib, ijobiy yo'l bilan yechim taklif qilish."],
  },
  {
    num: "07",
    title: "Sotuv voronkasiga qat'iy amal qilish",
    notes: ["Har bir muloqot bosqichma-bosqich: Munosabat o'rnatish, ehtiyoj aniqlash, taklif berish, yakunlash."],
  },
  {
    num: "08",
    title: "Birinchi bo'lib — yangi lidlarga 10 daqiqa ichida javob berish",
    notes: ["Yangi qiziqish bildirgan lidlar sovumasdan, darhol ishlov berish kerak."],
  },
  {
    num: "09",
    title: "Har haftalik \"Call Listening\" tahlillari",
    notes: ["Haftada bir marta suhbatlarni tinglab, xatolarni aniqlash va to'g'rilash."],
  },
  {
    num: "10",
    title: "Mahsulot va sotuv bo'yicha bilimlarni yangilab borish",
    notes: ["Yangiliklardan xabardor bo'lish va ularni mijozlarga yetkazish."],
  },
  {
    num: "11",
    title: "Tashqi bilim manbalaridan foydalanish",
    notes: ["Internetda savdo texnikalari, muloqot uslublari bo'yicha bilimlarni oshirish."],
  },
  {
    num: "12",
    title: "Fikr va takliflarni boshqaruvga yetkazish",
    notes: ["Mijozlardan kelgan foydali takliflarni rahbariyatga yetkazish."],
  },
  {
    num: "13",
    title: "Mijozlar bilan doimiy aloqani saqlash",
    notes: [
      "Mijozlar bilan muntazam yangilanishlar bilan bog'lanish.",
      "Namuna xabar (aynan shu ko'rinishda, bo'shliqlar bilan saqlansin — bu operator to'ldiradigan shablon): \"____ aka, noyabr oyida bizda _______ mahsulotimizga chegirmalar mavjud. Sizni qiziqtiradimi?\" — Telegramlariga yangi xabar va takliflarni yuborib turish.",
    ],
  },
  {
    num: "14",
    title: "Tizimlilik va intizomni saqlash",
    notes: ["Vaqtni to'g'ri taqsimlash, barcha rejalashtirilgan qo'ng'iroqlarni o'z vaqtida amalga oshirish."],
  },
];

export default function CommunicationStandardsPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);

  const path = "/standards/communication-standards";
  const node = findNode(path);

  return (
    <DocPageTemplate path={path} title="Muloqot standartlari" description={node?.description}>
      <div className="flex flex-col gap-5 relative">
        {/* Chiziq - visual pipeline effect (sales-funnel bilan bir xil) */}
        <div className="absolute left-6 top-8 bottom-8 w-[2px] bg-border hidden sm:block"></div>

        {RULES.map((rule) => (
          <div key={rule.num} className="relative flex flex-col sm:flex-row gap-4 sm:gap-6 group">
            {/* Number Badge */}
            <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-surface bg-surface-alt font-mono text-[16px] font-bold text-primary-dark shadow-soft transition-colors group-hover:border-primary group-hover:bg-primary/10">
              {rule.num}
            </div>

            {/* Content Card */}
            <div className="flex-1 rounded-2xl border border-border bg-surface p-5 shadow-soft transition-all hover:border-primary/30 hover:shadow-elevated">
              <h4 className="text-[16px] font-bold text-primary-dark mb-2">{rule.title}</h4>
              <div className="space-y-1.5">
                {rule.notes.map((note, i) => (
                  <p key={i} className="text-[14px] leading-relaxed text-text-secondary">
                    {note}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </DocPageTemplate>
  );
}
