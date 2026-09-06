export type ScriptBlock =
  | { kind: "subheading"; text: string }
  | { kind: "dialogue"; lines: string[] }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[]; ordered?: boolean }
  | { kind: "labeled-list"; items: { label: string; text: string }[] }
  | { kind: "callout"; text: string; linkHref?: string; linkLabel?: string };

export interface ScriptSection {
  heading: string;
  note?: string;
  blocks: ScriptBlock[];
}

export interface SalesScript {
  slug: string;
  title: string;
  cheatSheet: string;
  sections: ScriptSection[];
}

export const scripts: SalesScript[] = [
  {
    slug: "lead-orqali-tushgan",
    title: "Target orqali tushgan lidlar uchun",
    cheatSheet:
      "Ism bilan murojaat qil → qiziqish manbasini eslat → 2 daqiqa ruxsat so'ra → faoliyat turi va manzilni aniqla → SPIN → FAB → e'tirozga javob → aniq vaqt/ofisga taklif bilan yakunla.",
    sections: [
      {
        heading: "1. Munosabat o'rnatish",
        blocks: [
          { kind: "subheading", text: "Kirish:" },
          {
            kind: "dialogue",
            lines: [
              "Operator: Assalamu aleykum, _______ aka yaxshimisiz? (agar ismini yozmagan bo'lsa, murojaat qilish uchun ismingizni bilsam bo'ladimi?)",
              "Mijoz: Rahmat, yaxshi.",
              "Operator: Mening ismim _________, WaterTech korxonasidan aloqaga chiqayapman. _______ aka Instagram/Facebook orqali issiq, sovuq va kanalizatsiya quvurlarimizga qiziqish bildirgan ekansiz, yodingizdami?",
              "Mijoz: Ha to'g'ri, qoldirganman.",
              "Operator: Qiziqishingiz uchun rahmat. Murojaatingiz yuzasidan 2 daqiqa vaqtingizni olaman, qarshi emasmisiz?",
              "Mijoz: Albatta, eshitaman",
            ],
          },
          { kind: "subheading", text: "Faoliyatni aniqlash:" },
          {
            kind: "dialogue",
            lines: [
              "Operator: Faoliyatingiz turini bilsam bo'ladimi _____ aka, santexnika do'koningiz bormi, ulgurji savdogarmisiz yoki qurilish kompaniyasi uchun xarid qilmoqchimisiz?",
              "Mijoz: (faoliyat turini aytadi)",
              "Operator: Qaysi manzilda joylashgan? (do'kon, ombor, qurilish kompaniya)",
            ],
          },
          { kind: "subheading", text: "QQS tasdig'i:" },
          {
            kind: "dialogue",
            lines: [
              "Operator: Tanishganimdan xursandman _____ aka. Siz do'kon rahbarimisiz yoki sotuvchi? (agar qurilish kompaniyasidan bo'lsa, ta'minotchi bo'lishi kerak)",
            ],
          },
        ],
      },
      {
        heading: "2. SPIN — Ehtiyojni aniqlash",
        blocks: [
          { kind: "subheading", text: "Vaziyatni aniqlash:" },
          {
            kind: "dialogue",
            lines: [
              "Operator: Qancha vaqtdan beri ushbu faoliyat bilan shug'ullanasiz ______ aka? Shu vaqtgacha qaysi brendlar bilan ishladingiz va hozirgi yetkazib beruvchilaringiz kimlar, ya'ni qaysi brendlar bilan hamkorlikda ishlayapsiz?",
              "Operator: Mahsulotlarimizga qiziqishingizdan kelib chiqib, siz asosan do'kon zaxirasi uchunmi, yoki aniq bir qurilish loyihasi uchun xarid qilyapsizmi?",
            ],
          },
          { kind: "subheading", text: "Muammoni aniqlash:" },
          {
            kind: "dialogue",
            lines: [
              "Operator: Raqobatchilarimiz bilan ishlashda sizni eng ko'p nima bezovta qiladi? Yetkazish muddati tez-tez buziladimi, yoki fitinglar sifati bilan bog'liq muammolar bormi?",
              "Operator: Agar shu muammolarni bartaraf etsak, siz bizdan WaterTech quvurlar va fitinglardan o'rtacha oylik necha so'mlik hajmda xarid qilishni rejalashtiryapsiz yoki xarid qilgan bo'lar edingiz?",
            ],
          },
        ],
      },
      {
        heading: "3. FAB — Qiymatni joylashtirish",
        blocks: [
          {
            kind: "dialogue",
            lines: [
              "Operator: \"_____ aka, Sizning asosiy tashvishingiz [Mijoz Aytgan Og'riq Nuqtasi] ekanligini tushundim. Bu muammoni hal qilish uchun sizga _____ brendimizni tavsiya qilaman. Nega deysizmi?\"",
            ],
          },
          {
            kind: "paragraph",
            text: "Xususiyat (F): \"Bizning mahsulotlarimiz Germaniya texnologiyasi asosida asl polipropilendan yuqori aniqlikda ishlab chiqariladi. Boshqa brendlardagidek mel qo'shilmaydi.\"",
          },
          {
            kind: "paragraph",
            text: "Afzallik (A): \"Bu shuni anglatadiki, bizning quvurlarimiz 5-7 bar yuqori bosimga va yuqori haroratga chidaydi. Eng asosiysi, siz bizdan 10 yil rasmiy kafolat va muammo bo'lsa tez almashtirish xizmatini olasiz.\"",
          },
          { kind: "paragraph", text: "Foyda (B): \"Bu siz uchun bevosita IKKI NARSAni anglatadi:" },
          {
            kind: "list",
            items: [
              "Yo'qotilgan Obro'ni Tiklash: Ustalar va mijozlaringiz sizning do'koningizni eng ishonchli materiallar nuqtasi sifatida tavsiya qiladi (Chunki muammo bo'lmaydi).",
              "Xavfsiz Oborot: Bizning 10 yillik yaroqlilik muddati va ISO/GOST sertifikatlari sizning mijozlaringizga uzoq muddatli kafolat beradi.",
            ],
          },
          {
            kind: "dialogue",
            lines: [
              "Operator: Keling men sizga hozir praysimizni yuboraman, mahsulotlarimiz bilan tanishib chiqib raqobatchilarimiz bilan solishtirib ko'rishni tavsiya qilaman.",
            ],
          },
          { kind: "subheading", text: "Nega aynan biz — qo'shimcha argumentlar:" },
          {
            kind: "list",
            ordered: true,
            items: [
              "Mahsulotlar 3 xil segment uchun ishlab chiqariladi: WaterTech, AquaPower va AquaTherm. Narxga emas, kompleks yechimga e'tibor qarating.",
              "Kafolat va qaytarish siyosati — mahsulotga 10 yil kafolat, muammo bo'lsa almashtirib beriladi.",
              "Ulgurji xaridorlar uchun shaxsiy chegirmalar va bonuslar mavjud.",
            ],
          },
        ],
      },
      {
        heading: "4. Yakuniy qadam",
        blocks: [
          {
            kind: "list",
            ordered: true,
            items: [
              "Aniq qayta aloqa vaqti: \"Sizga yakshanba 14:00 yoki dushanba 10:00 qayta aloqaga chiqsam qulay bo'ladimi?\"",
              "Officega taklif: Narx shartlarini joyida, barcha hujjatlar bilan ko'rib chiqish uchun ofisga tashrif taklif qilinadi, alohida menejer biriktirilib, zavodga ekskursiya tashkil qilinadi. Tashrif kunini aniqlashtiring, bir kun oldin eslatib qo'ying.",
              "Namuna yuborish kafolati: \"Katta buyurtma berishdan avval sifatga ishonch hosil qilish tabiiy. Sizga fitinglarimiz va trubalarimizning namunasini yuboramiz.\"",
              "Menejer taklifi: Hajmga mos shaxsiy chegirmalar va moslashuvchan to'lov usullari (muddatli to'lov/nasiya) bo'yicha menejer bilan qisqa uchrashuv taklif qilinadi.",
            ],
          },
          {
            kind: "callout",
            text: "Qabul qilinmaydigan javoblar: \"O'ylab ko'raman\" yoki \"Keyinroq telefon qilaman\" kabi maqsadsiz javoblar — bunday holatda operator aniqlashtiruvchi savol berishi shart.",
            linkHref: "/sales-process/objections",
            linkLabel: "E'tirozlar bo'limiga qarang →",
          },
        ],
      },
    ],
  },
  {
    slug: "sovuq-qongiroq",
    title: "Sovuq qo'ng'iroqlar uchun",
    cheatSheet:
      "Qisqa tanishtir → ЛПР (qaror qabul qiluvchi)ni aniqla → SPIN (vaziyat→muammo→natija→ehtiyoj) → FAB → keyingi qadamni belgila → rahmat ayt.",
    sections: [
      {
        heading: "1. Munosabat o'rnatish",
        blocks: [
          {
            kind: "dialogue",
            lines: [
              "Operator: Assalamu aleykum yaxshimisiz, mening ismim ________, WaterTech kompaniyasi menejeri bo'laman, hamkorlik masalasida aloqaga chiqayapman. 2 daqiqa vaqtingizni olaman qarshi emasmisiz?",
              "Mijoz: Xo'sh eshitaman",
              "Operator: Murojaat qilish uchun ismingizni bilsam bo'ladimi?",
            ],
          },
          { kind: "subheading", text: "ЛПР (qaror qabul qiluvchi) tasdig'i:" },
          {
            kind: "dialogue",
            lines: ["Operator: Qaysi pozitsiyada faoliyat yuritishingizni bilsam bo'ladi?"],
          },
          {
            kind: "paragraph",
            text: "Maqsad — qaror qabul qiluvchi shaxs bilan aloqa o'rnatish. \"Tanishganimdan xursandman\" deb suhbat davom ettiriladi.",
          },
        ],
      },
      {
        heading: "2. SPIN",
        blocks: [
          {
            kind: "labeled-list",
            items: [
              {
                label: "Vaziyatni aniqlash",
                text: "Nima faoliyat bilan shug'ullanasiz? Qaysi hududda faoliyat yuritasiz? Hozirda qaysi kompaniyalar bilan hamkorlikda ishlaysiz?",
              },
              {
                label: "Muammolarni aniqlash",
                text: "Hamkorlaringiz bilan qanday muammolar tez-tez uchrab turadi? Misol uchun logistika, mahsulot sifati, chegirma va narx o'zgarishi, nasiya shartlari.",
              },
              {
                label: "Natija",
                text: "Agar bu muammolar hal qilinmasa, korxonangizning samaradorligiga, mijozlar bilan munosabatingizga qanday ta'sir qiladi?",
              },
              {
                label: "Ehtiyoj va foyda",
                text: "Agar bizning mahsulotlarimiz yordamida bu muammolarni hal qilsangiz, kompaniyangiz qanday foyda oladi va bu taklif sizga qiziq bo'ladimi?",
              },
            ],
          },
        ],
      },
      {
        heading: "3. FAB",
        blocks: [
          { kind: "dialogue", lines: ["Operator: Mahsulotlarimiz haqida biroz ma'lumot bersam qarshi emasmisiz?"] },
          {
            kind: "paragraph",
            text: "Xususiyat (F): Bizning mahsulotlarimiz Germaniya texnologiyasi asosida asl polipropilendan yuqori aniqlikda ishlab chiqariladi. Boshqa brendlardagidek mel qo'shilmaydi.",
          },
          {
            kind: "paragraph",
            text: "Afzallik (A): Bu shuni anglatadiki, bizning quvurlarimiz 5-7 bar yuqori bosimga va yuqori haroratga chidaydi. Eng asosiysi, siz bizdan 10 yil rasmiy kafolat va muammo bo'lsa tez almashtirish xizmatini olasiz.",
          },
          { kind: "paragraph", text: "Foyda (B): Bu siz uchun bevosita IKKI NARSAni anglatadi:" },
          {
            kind: "list",
            items: [
              "Yo'qotilgan Obro'ni Tiklash: eng ishonchli materiallar nuqtasi sifatida tavsiya qilinasiz.",
              "Xavfsiz Oborot: 10 yillik yaroqlilik muddati va ISO/GOST sertifikatlari uzoq muddatli kafolat beradi.",
            ],
          },
          {
            kind: "dialogue",
            lines: [
              "Operator: Keling men sizga hozir praysimiz, mahsulotlarimiz haqida ma'lumot yuboraman, raqobatchilarimiz bilan solishtirib ko'rishni tavsiya qilaman.",
            ],
          },
        ],
      },
      {
        heading: "4. Yakuniy harakat",
        blocks: [
          {
            kind: "list",
            items: [
              "Keyingi qadamlar: \"Kelgusi hafta dushanba kuni, tushdan keyin siz bilan uchrashuv belgilasak bo'ladimi?\" yoki \"Sizga bepul sinov to'plamini yuborsam qarshi emasmisiz?\" — kun va vaqtni aniq belgilang.",
              "Rahmat ayting, yana aloqa qilishga tayyorligingizni bildiring.",
              "Tahlil: qo'ng'iroqdan keyin nima ishlagani, nimani yaxshilash kerakligini aniqlang.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "ustalar-uchun",
    title: "Ustalar uchun",
    cheatSheet:
      "Manba/qiziqishni eslat → faoliyat va manzilni aniqla → o'rnatish/sifat og'riqlarini so'ra → tavsiya sababini va bonus turini aniqla → bilim/qo'llab-quvvatlash ehtiyojini aniqla → \"Usta Klubi\"ga taklif bilan yakunla.",
    sections: [
      {
        heading: "1. Munosabat o'rnatish",
        blocks: [
          {
            kind: "paragraph",
            text: "(Target orqali tushgan lidlar uchun skript bilan bir xil kirish qismi ishlatiladi — ism, WaterTech tanishtiruvi, qiziqish manbasini eslatish, 2 daqiqa ruxsat, faoliyat turi, manzil.)",
          },
        ],
      },
      {
        heading: "2. O'rnatish va sifat og'riqlari (texnik fikr-mulohaza)",
        blocks: [
          {
            kind: "labeled-list",
            items: [
              {
                label: "Eng katta muammo",
                text: "\"Polipropilen quvurlarni o'rnatishda, ayniqsa fitinglarni ulashda sizni eng ko'p nima bezovta qiladi? Qaysi brenddagi fitinglar vaqtingizni eng ko'p oladi?\"",
              },
              {
                label: "Tezlik va qulaylik",
                text: "\"Quvurlarni to'g'ri o'rnatishda eng qulay, vaqtni tejaydigan brend kimniki?\"",
              },
            ],
          },
        ],
      },
      {
        heading: "3. Tavsiya va daromad motivatsiyasi",
        note: "Maqsad — ustani \"Usta Klubi\" dasturiga jalb qilish.",
        blocks: [
          {
            kind: "labeled-list",
            items: [
              {
                label: "Tavsiyaning sababi",
                text: "\"Mijozga biror brendni tavsiya qilganingizda, bu qarorni narxga asoslaysizmi, ishonchlilikka asoslaysizmi yoki siz uchun qo'shimcha rag'batlantirish (bonus) muhimmi?\"",
              },
              {
                label: "Rasmiy shartnoma",
                text: "\"Ayni vaqtda qaysidir ishlab chiqaruvchi bilan rasmiy shartnoma asosida ishlaysizmi? Agar ishlayotgan bo'lsangiz, ular sizga qanday taklif berishayapti?\"",
              },
              {
                label: "Bonus turlari",
                text: "\"Siz uchun pul ko'rinishidagi tezkor bonus (cashback) yaxshimi, yoki ishingizni yengillashtiradigan qimmatbaho asboblar/texnikalar (masalan, yaxshi payvandlash uskunasi) yaxshiroqmi?\"",
              },
              {
                label: "Qayta aloqa",
                text: "\"Siz tavsiya qilgan mahsulot sotilgani uchun bonus olish jarayonini qanday tasavvur qilasiz? QR-kod orqali yoki do'kon tasdig'i orqali? Qaysi biri siz uchun qulay va ishonchli?\"",
              },
            ],
          },
        ],
      },
      {
        heading: "4. Bilim va qo'llab-quvvatlash ehtiyojlari",
        blocks: [
          {
            kind: "labeled-list",
            items: [
              {
                label: "Yangi texnologiyalar",
                text: "\"Polipropilen quvurlar bo'yicha yangi o'rnatish usullari yoki texnologiyalari haqida bepul seminar/master-klasslarda ishtirok etishga qanchalik qiziqasiz? Ular qaysi hududda o'tkazilsa, qulay bo'ladi?\"",
              },
              {
                label: "Ish qidirish",
                text: "\"Qurilish mavsumi past bo'lgan paytda, WaterTech kompaniyasi sizga o'z kanallari orqali kichik buyurtmalar topishga yordam bersa, bu sizga qanchalik foydali bo'ladi?\"",
              },
            ],
          },
        ],
      },
      {
        heading: "5. Yakun",
        blocks: [
          {
            kind: "paragraph",
            text: "_______ aka korxonamiz viloyatlar va tumanlararo Santexnika mutaxassislari klubini tashkil qilayotgan edi, shu sababli sizdek mutaxassislarni fikrlarini eshitib xulosa qilish biz uchun juda muhim deb bildik, tez orada sizga taklif bilan chiqaman albatta.",
          },
        ],
      },
    ],
  },
  {
    slug: "qayta-aloqa",
    title: "Qayta aloqa uchun",
    cheatSheet: "Eslatib o'tish → oxirgi suhbatni eslash → qaror holatini so'ra → to'sqinlik sababini aniqla → yordam taklif qil.",
    sections: [
      {
        heading: "Skript",
        blocks: [
          {
            kind: "dialogue",
            lines: [
              "Operator: Assalamu aleykum _____ aka yaxshimisiz, salomatmisiz? Men WaterTech kompaniyasidan ________man, siz bilan polipropilen quvurlar, fitinglar, kanalizatsiya quvurlari hamkorligi masalasida gaplashgan edik, esladingizmi?",
              "Operator: Oxirgi suhbatimizda (qaysi masala yuzasidan aloqaga chiqayotganingizni aniqlab ayting) ustam bilan o'ylab ko'rishimiz kerak deb aytgan edingiz, nima bo'ldi, qanday qarorga keldingiz? Mahsulotimiz sifati, narxlarimiz sizga maqul keldimi?",
              "Operator: Qachon hamkorlik qilishni rejalashtirayapsiz?",
              "Operator: Hamkorlik qilishimiz uchun nimalar to'sqinlik qilmoqda?",
              "Operator: Qaysi ma'lumotlarni sizga to'g'ri va to'liq yetkazib bera olmadim?",
              "Operator: Takliflaringiz bo'lsa albatta eshitaman, sizga qanday yordam bera olaman?",
            ],
          },
        ],
      },
    ],
  },
];
