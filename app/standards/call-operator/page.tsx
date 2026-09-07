import { DocPageTemplate } from "@/components/DocPageTemplate";

const rules = [
  {
    title: "Mijozlarga professional muloqot qo'ng'irog'ini amalga oshirish",
    desc: "Har bir mijoz bilan iliq, e'tiborli va aniq muloqot qilish zarur. Mijoz o'zini qadrli his qilishi kerak.",
  },
  {
    title: "CRM tizimida real vaqt rejimida ishlash",
    desc: "Har bir lid ustida ish boshlaganda va tugatganda CRM'da statusni yangilash kerak.",
  },
  {
    title: "Yangi leadlarga agar javob bermasa 5 kun davomida har kuni lidga 2 marta qo'ng'iroq qilish",
    desc: "Mijoz sovib ketmasligi uchun 1 kun ichida 2 marotaba aloqa qilish kerak.\nLid kiritilgach: 1-qo'ng'iroq 10:00–12:00 da, 2-qo'ng'iroq 15:00–17:00 amalga oshiriladi.",
  },
  {
    title: "Kunlik minimal 40 ta qo'ng'iroq bajarish",
    desc: "Kunlik muloqot hajmi kamida 40 ta bo'lishi zarur, shunda ko'proq sotuv imkoniyati yaratiladi.",
  },
  {
    title: "Skriptlar asosida, lekin jonli muloqotda ishlash",
    desc: "Mijozni sun'iy gaplar bilan zeriktirmaslik, ssenariyni jonlantirib gapirish.",
  },
  {
    title: "Mijoz shikoyatlarini imkon qadar telefon orqali ijobiy hal qilish",
    desc: "Mijoz bilan bahslashmasdan, muammoni eshitib, ijobiy yo'l bilan yechim taklif qilish.",
  },
  {
    title: "Sotuv voronkasiga qat'iy amal qilish",
    desc: "Har bir muloqot bosqichma-bosqich: Munosabat o'rnatish, ehtiyoj aniqlash, taklif berish, yakunlash.",
  },
  {
    title: "Birinchi bo'lib — Yangi lidlarga 10 daqiqa ichida javob berish",
    desc: "Yangi qiziqish bildirgan lidlar sovumasdan, darhol ishlov berish kerak.",
  },
  {
    title: "Har haftalik \"Call Listening\" tahlillari",
    desc: "Haftada bir marta suhbatlarni tinglab, xatolarni aniqlash va to'g'rilash.",
  },
  {
    title: "Mahsulot va sotuv bo'yicha bilimlarni yangilab borish",
    desc: "Yangiliklardan xabardor bo'lish va ularni mijozlarga yetkazish.",
  },
  {
    title: "Tashqi bilim manbalaridan foydalanish",
    desc: "Internetda savdo texnikalari, muloqot uslublari bo'yicha bilimlarni oshirish.",
  },
  {
    title: "Fikr va takliflarni boshqaruvga yetkazish",
    desc: "Mijozlardan kelgan foydali takliflarni rahbariyatga yetkazish.",
  },
  {
    title: "Mijozlar bilan doimiy aloqani saqlash",
    desc: "Mijozlar bilan muntazam yangilanishlar bilan bog'lanish.\n\"____ aka noyabr oyida bizda _______ mahsulotimizga chegirmalar mavjud. Sizni qiziqtiradimi?\" — Telegramlariga yangi xabar va takliflarni yuborib turish.",
  },
  {
    title: "Tizimlilik va intizomni saqlash",
    desc: "Vaqtni to'g'ri taqsimlash, barcha rejalashtirilgan qo'ng'iroqlarni o'z vaqtida amalga oshirish.",
  }
];

export default function CallOperatorPage() {
  return (
    <DocPageTemplate 
      path="/standards/call-operator" 
      title="Call Operator" 
      description="Call operator vazifalar va qoidalar ro'yxati."
      meta={{ lastUpdated: "Bugun", author: "Admin", readingTime: 5 }}
    >
      <div className="space-y-4">
        {rules.map((rule, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface-alt p-5 shadow-sm">
            <h3 className="mb-2 text-[15px] font-bold text-primary-dark">
              {i + 1}. {rule.title}
            </h3>
            <div className="space-y-1.5 text-[14px] text-text-secondary">
              {rule.desc.split("\n").map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DocPageTemplate>
  );
}
