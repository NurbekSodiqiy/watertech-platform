import type { Script, Stage } from "./types";

const ALL_OBJECTION_IDS = ["obj-qimmat", "obj-fitting", "obj-think", "obj-risk"];

/** Fills in nextStageId from array order instead of hand-typing it per stage. */
function chain(stages: Array<Omit<Stage, "nextStageId">>): Stage[] {
  return stages.map((s, i) => ({ ...s, nextStageId: stages[i + 1]?.id }));
}

export const scripts: Script[] = [
  {
    id: "lead-orqali-tushgan",
    name: "Target orqali tushgan lidlar",
    cheatSheet:
      "Ism bilan murojaat qil → qiziqish manbasini eslat → 2 daqiqa ruxsat so'ra → faoliyat turi va manzilni aniqla → SPIN → FAB → e'tirozga javob → aniq vaqt/ofisga taklif bilan yakunla.",
    stages: chain([
      {
        id: "stage-1",
        label: "Munosabat o'rnatish",
        objectionIds: [],
        turns: [
          { speaker: "operator", subStepHeader: "1.1 Kirish", text: "Assalamu aleykum, ______ aka yaxshimisiz?" },
          { speaker: "note", condition: "ismini yozmagan bo'lsa", text: "murojaat qilish uchun ismingizni bilsam bo'ladimi?" },
          { speaker: "mijoz", text: "Rahmat, yaxshi." },
          {
            speaker: "operator",
            text: "Mening ismim _______, WaterTech korxonasidan aloqaga chiqayapman. ______ aka Instagram/Facebook orqali issiq, sovuq va kanalizatsiya quvurlarimizga qiziqish bildirgan ekansiz, yodingizdami?",
          },
          { speaker: "mijoz", text: "Ha to'g'ri, qoldirganman." },
          { speaker: "operator", text: "Qiziqishingiz uchun rahmat. Murojaatingiz yuzasidan 2 daqiqa vaqtingizni olaman, qarshi emasmisiz?" },
          { speaker: "mijoz", text: "Albatta, eshitaman" },
          {
            speaker: "operator",
            subStepHeader: "1.2 Faoliyatni aniqlash",
            text: "Faoliyatingiz turini bilsam bo'ladimi ____ aka, santexnika do'koningiz bormi, ulgurji savdogarmisiz yoki qurilish kompaniyasi uchun xarid qilmoqchimisiz?",
          },
          { speaker: "mijoz", text: "(faoliyat turini aytadi)" },
          { speaker: "operator", text: "Qaysi manzilda joylashgan?" },
          { speaker: "note", text: "(do'kon, ombor, qurilish kompaniya)" },
          { speaker: "operator", subStepHeader: "1.3 QQS tasdig'i", text: "Tanishganimdan xursandman ____ aka. Siz do'kon rahbarimisiz yoki sotuvchi?" },
          { speaker: "note", condition: "qurilish kompaniyasidan bo'lsa", text: "ta'minotchi bo'lishi kerak" },
        ],
      },
      {
        id: "stage-2",
        label: "Ehtiyojni aniqlash",
        objectionIds: [],
        turns: [
          {
            speaker: "operator",
            subStepHeader: "2.1 Vaziyatni aniqlash",
            text: "Qancha vaqtdan beri ushbu faoliyat bilan shug'ullanasiz ____ aka? Shu vaqtgacha qaysi brendlar bilan ishladingiz va hozirgi yetkazib beruvchilaringiz kimlar, ya'ni qaysi brendlar bilan hamkorlikda ishlayapsiz.",
          },
          {
            speaker: "operator",
            text: "Mahsulotlarimizga qiziqishingizdan kelib chiqib, siz asosan do'kon zaxirasi uchunmi, yoki aniq bir qurilish loyihasi uchun xarid qilyapsizmi?",
          },
          { speaker: "mijoz", text: "(javob beradi)" },
          {
            speaker: "operator",
            subStepHeader: "2.2 Muammoni aniqlash",
            text: "Raqobatchilarimiz bilan ishlashda sizni eng ko'p nima bezovta qiladi? Yetkazish muddati tez-tez buziladimi, yoki fitinglar sifati bilan bog'liq muammolar bormi?",
          },
          { speaker: "mijoz", text: "(agar muammo bo'lsa muammosini aytadi, yoki hammasi yaxshi deydi)" },
          {
            speaker: "operator",
            text: "Agar shu muammolarni bartaraf etsak, siz bizdan WaterTech quvur va fitinglardan o'rtacha oylik necha so'mlik hajmda xarid qilishni rejalashtiryapsiz yoki xarid qilgan bo'lar edingiz?",
          },
        ],
      },
      {
        id: "stage-3",
        label: "Mahsulot taqdimoti",
        objectionIds: [],
        turns: [
          {
            speaker: "operator",
            text: "____ aka, Sizning asosiy tashvishingiz [Mijoz Aytgan Og'riq Nuqtasi] ekanligini tushundim. Bu muammoni hal qilish uchun sizga ____ brendimizni tavsiya qilaman. Nega deysizmi?",
          },
          {
            speaker: "operator",
            subStepHeader: "1. Xususiyat (F)",
            text: "Bizning mahsulotlarimiz Germaniya texnologiyasi asosida asl polipropilendan yuqori aniqlikda ishlab chiqariladi. Boshqa brendlardagidek mel qo'shilmaydi.",
          },
          {
            speaker: "operator",
            subStepHeader: "2. Afzallik (A)",
            text: "Bu shuni anglatadiki, bizning quvurlarimiz 5-7 bar yuqori bosimga va yuqori haroratga chidaydi. Eng asosiysi, siz bizdan 10 yil rasmiy kafolat va muammo bo'lsa tez almashtirish xizmatini olasiz.",
          },
          {
            speaker: "operator",
            subStepHeader: "3. Foyda (B)",
            text: "Bu siz uchun bevosita IKKI NARSAni anglatadi:\n- Yo'qotilgan obro'ni tiklash: Ustalar va mijozlaringiz sizning do'koningizni eng ishonchli materiallar nuqtasi sifatida tavsiya qiladi (chunki muammo bo'lmaydi).\n- Xavfsiz oborot: Bizning 10 yillik yaroqlilik muddati va ISO/GOST sertifikatlari sizning mijozlaringizga uzoq muddatli kafolat beradi.",
          },
          {
            speaker: "operator",
            text: "Keling, men sizga hozir praysimizni yuboraman, mahsulotlarimiz bilan tanishib chiqib raqobatchilarimiz bilan solishtirib ko'rishni tavsiya qilaman.",
          },
        ],
      },
      {
        id: "stage-4",
        label: "Raqobatdan ustunligimiz",
        objectionIds: [],
        turns: [
          {
            speaker: "operator",
            text: "1. Bizning mahsulotlar 3 xil segment uchun ishlab chiqariladi: WaterTech, AquaPower va AquaTherm. Narxga emas, kompleks yechimga e'tibor qarating.\n2. Kafolat va qaytarish siyosati — mahsulotimizga 10 yil kafolat beramiz va muammo bo'lsa almashtirib beramiz.\n3. Ulgurji xaridorlarimiz uchun shaxsiy chegirmalar va bonuslarimiz mavjud.",
          },
        ],
      },
      {
        id: "stage-5",
        label: "E'tiroz ustida ishlash",
        objectionIds: ALL_OBJECTION_IDS,
        turns: [],
      },
      {
        id: "stage-6",
        label: "Yakuniy qadam",
        objectionIds: [],
        turns: [
          { speaker: "operator", subStepHeader: "1. Aniq qayta aloqa vaqti", text: "Sizga yakshanba 14:00 yoki dushanba 10:00 qayta aloqaga chiqsam qulay bo'ladimi?" },
          {
            speaker: "operator",
            subStepHeader: "2. Ofisga taklif",
            text: "Narx shartlarini joyida, barcha hujjatlar bilan ko'rib chiqish uchun, ofisimizga tashrif buyursangiz qulayroq bo'lardi. Siz uchun alohida menejer biriktirib, ishlab chiqarish zavodimizga ekskursiya tashkil qilib beraman. Bu mahsulotlarimizni bemalol istalgan usulda sifatini tekshirib ko'rishingizga imkoniyat yaratadi. Tashrif kuningizni aytsangiz men belgilab qo'yaman va bir kun oldin aloqaga chiqib eslatib qo'yaman. Sizga _____ kuni [soat] yoki ____ kuni [soat] maqul bo'ladimi?",
          },
          {
            speaker: "operator",
            subStepHeader: "3. Namuna yuborish kafolati",
            text: "Katta buyurtma berishdan avval sifatga ishonch hosil qilish tabiiy. Sizga fitinglarimiz va trubalarimizning namunasini yuboramiz. Istalgan usulda tekshirib ko'rishingiz mumkin. Biz sifatimizga kafolat beramiz.",
          },
          {
            speaker: "operator",
            subStepHeader: "4. Menejer taklifi",
            text: "Biz sizga yuqorida aytilgan kafolatlar va keng assortimentni taqdim eta olamiz. Endi gap faqat moliyaviy shartlarda qoldi. Sizning hajmga mos shaxsiy chegirmalarni (ulgurji xaridor sifatida) va moslashuvchan to'lov usullarini (muddatli to'lov/nasiya) muhokama qilish uchun sizga mutaxassis (menejerimiz) bilan qisqa uchrashuv rejalashtiraylik.\n\nMenejerimizga [Kun va Vaqt] yoki [Boshqa Kun va Vaqt] qulay bo'ladi? Ular shaxsan borib, barcha hujjatlar, sertifikatlar va sinov to'plamini olib borishadi.",
          },
          {
            speaker: "note",
            text: "MUHIM: \"O'ylab ko'raman\" yoki \"Keyinroq telefon qilaman\" kabi maqsadsiz javoblar qabul qilinmaydi — operator aniq kun/vaqt bilan yakunlashi shart.",
          },
        ],
      },
    ]),
  },
  {
    id: "sovuq-qongiroq",
    name: "Sovuq qo'ng'iroq",
    cheatSheet:
      "Qisqa tanishtir → ЛПР (qaror qabul qiluvchi)ni aniqla → SPIN (vaziyat→muammo→natija→ehtiyoj) → FAB → keyingi qadamni belgila → rahmat ayt.",
    stages: chain([
      {
        id: "sovuq-1",
        label: "Munosabat o'rnatish",
        objectionIds: [],
        turns: [
          {
            speaker: "operator",
            subStepHeader: "Tanishuv",
            text: "Assalamu aleykum yaxshimisiz, mening ismim _______, WaterTech kompaniyasi menedjeri bo'laman, hamkorlik masalasida aloqaga chiqayapman. 2 daqiqa vaqtingizni olaman qarshi emasmisiz?",
          },
          { speaker: "mijoz", text: "Xo'sh eshitaman" },
          { speaker: "operator", text: "Murojat qilish uchun ismingizni bilsam bo'ladimi?" },
          { speaker: "operator", subStepHeader: "ЛПР Tasdig'i", text: "Qaysi pozitsiyada faoliyat yuritishingizni bilsam bo'ladim" },
          { speaker: "mijoz", text: "(ismini aytadi, balki \"davom etavering\" deyishi, aytmasligi ham mumkin)" },
          { speaker: "note", text: "(Bizning maqsadamiz — Qaror qabul qiluvchi shaxs bilan aloqa o'rnatish)" },
          { speaker: "note", text: "(Tanishganimdan xursandman deb suhbat davom ettiriladi)" },
        ],
      },
      {
        id: "sovuq-2",
        label: "Vaziyatni aniqlash (SPIN)",
        objectionIds: [],
        turns: [
          { speaker: "note", subStepHeader: "Vaziyatni aniqlash", text: "(Mijozning hozirgi holatini tushunish uchun savollar bering)" },
          {
            speaker: "operator",
            text: "Nima faoliyat bilan shug'ullanasiz?\nQaysi hududda faoliyat yuritasiz?\nHozirda qaysi kompaniyalar bilan hamkorlikda ishlaysiz?",
          },
          { speaker: "note", subStepHeader: "Muammolarini aniqlash", text: "(Mijozning muammolarini aniqlash uchun savollar bering)" },
          {
            speaker: "operator",
            text: "Hamkorlaringiz bilan qanday muammolar tez-tez uchrab turadi? Misol uchun logistika, mahsulot sifati, chegirma va narx o'zgarishi, nasiya shartlari",
          },
          { speaker: "note", subStepHeader: "Natija", text: "(Muammolarni hal qilmaslikning oqibatlarini tushuntirish uchun savollar bering)" },
          {
            speaker: "operator",
            text: "Agar bu muammolar hal qilinmasa, sizning korxonangizning samaradorligiga, mijozlar bilan munosabatingizga qanday ta'sir qiladi?",
          },
          { speaker: "note", subStepHeader: "Ehtiyoj va Foyda", text: "(Muammolarni hal qilishning foydasini tushuntirish uchun savollar bering)" },
          {
            speaker: "operator",
            text: "\"Agar bizning mahsulotlarimiz yordamida bu muammolarni hal qilsangiz, kompaniyangiz qanday foyda oladi va bu taklif sizga qiziq bo'ladimi?\"",
          },
        ],
      },
      {
        id: "sovuq-3",
        label: "Mahsulot taqdimoti (FAB)",
        objectionIds: [],
        turns: [
          { speaker: "operator", text: "Mahsulotlaramiz haqida biroz ma'lumot bersam qarshi emasmisiz?" },
          {
            speaker: "operator",
            subStepHeader: "1. Xususiyat (F)",
            text: "\"Bizning mahsulotlarimiz Germaniya texnologiyasi asosida asl polipropilendan yuqori aniqlikda ishlab chiqariladi. Boshqa brendlardagidek mel qo'shilmaydi.\"",
          },
          {
            speaker: "operator",
            subStepHeader: "2. Afzallik (A)",
            text: "\"Bu shuni anglatadiki, bizning quvurlarimiz 5-7 bar yuqori bosimga va yuqori haroratga chidaydi. Eng asosiysi, siz bizdan 10 yil rasmiy kafolat va muammo bo'lsa tez almashtirish xizmatini olasiz.\"",
          },
          {
            speaker: "operator",
            subStepHeader: "3. Foyda (B)",
            text: "\"Bu siz uchun bevosita IKKI NARSAni anglatadi:\n- Yo'qotilgan Obro'ni Tiklash: Ustalar va mijozlaringiz sizning do'koningizni eng ishonchli materiallar nuqtasi sifatida tavsiya qiladi (Chunki muammo bo'lmaydi).\n- Xavfsiz Oborot: Bizning 10 yillik yaroqlilik muddati va ISO/GOST sertifikatlari sizning mijozlaringizga uzoq muddatli kafolat beradi.\"",
          },
          {
            speaker: "operator",
            text: "Keling men sizga hozir praysimiz, mahsulotlarimiz haqida ma'lumot yuboraman, mahsulotlarimiz bilan tanishib chiqib raqobatchilarimiz bilan solishtirib ko'rishni tavsiya qilaman.",
          },
        ],
      },
      {
        id: "sovuq-4",
        label: "E'tiroz ustida ishlash",
        objectionIds: ALL_OBJECTION_IDS,
        turns: [],
      },
      {
        id: "sovuq-5",
        label: "Yakuniy harakat",
        objectionIds: [],
        turns: [
          {
            speaker: "operator",
            subStepHeader: "Keyingi qadamlar",
            text: "\"Kelgusi hafta dushanba kuni, tushdan keyin siz bilan uchrashuv belgilasak bo'ladimi?\", \"Kelgusi hafta dushanba kuni, tushdan keyin Siz aytgan manzilga bepul sinov to'plamini yuborsam qarshi emasmisiz?\" kabi savollar bilan keyingi qadamlarni aniqlang.",
          },
          { speaker: "note", text: "(uchrashuv kuni va vaqtini aniq ayting)" },
          {
            speaker: "operator",
            subStepHeader: "Rahmat ayting",
            text: "Mijozga vaqti uchun rahmat ayting va yana aloqa qilish uchun tayyor ekanligingizni bildiring, bu sovuq qo'ng'iroqlarda muhim qism",
          },
          { speaker: "operator", subStepHeader: "Tahlil", text: "Qo'ng'iroqlaringizni tahlil qilib, nimasi ishlaganini va nimani yaxshilash kerakligini aniqlang." },
        ],
      },
    ]),
  },
  {
    id: "ustalar-uchun",
    name: "Ustalar uchun",
    cheatSheet:
      "Manba/qiziqishni eslat → faoliyat va manzilni aniqla → o'rnatish/sifat og'riqlarini so'ra → tavsiya sababini va bonus turini aniqla → bilim/qo'llab-quvvatlash ehtiyojini aniqla → \"Usta Klubi\"ga taklif bilan yakunla.",
    stages: chain([
      {
        id: "ustalar-1",
        label: "Munosabat o'rnatish",
        objectionIds: [],
        turns: [
          { speaker: "operator", subStepHeader: "1.1 Kirish", text: "Assalamu aleykum, ______ aka yaxshimisiz?" },
          { speaker: "note", condition: "ismini yozmagan bo'lsa", text: "murojaat qilish uchun ismingizni bilsam bo'ladimi?" },
          { speaker: "mijoz", text: "Rahmat, yaxshi." },
          {
            speaker: "operator",
            text: "Mening ismim _______, WaterTech korxonasidan aloqaga chiqayapman. ______ aka Instagram/Facebook orqali issiq, sovuq va kanalizatsiya quvurlarimizga qiziqish bildirgan ekansiz, yodingizdami?",
          },
          { speaker: "mijoz", text: "Ha to'g'ri, qoldirganman." },
          { speaker: "operator", text: "Qiziqishingiz uchun rahmat. Murojaatingiz yuzasidan 2 daqiqa vaqtingizni olaman, qarshi emasmisiz?" },
          { speaker: "mijoz", text: "Albatta, eshitaman" },
          {
            speaker: "operator",
            subStepHeader: "1.2 Faoliyatni Aniqlash",
            text: "Faoliyatingiz turini bilsam bo'ladimi ____ aka, santexnika do'koningiz bormi, ulgurji savdogarmisiz yoki qurilish kompaniyasi uchun xarid qilmoqchimisiz?",
          },
          { speaker: "mijoz", text: "Faoliyat turini aytadi." },
          { speaker: "operator", text: "Qaysi manzilda faoliyat yuritasiz?" },
        ],
      },
      {
        id: "ustalar-2",
        label: "O'rnatish va sifat og'riqlari",
        objectionIds: [],
        turns: [
          {
            speaker: "operator",
            subStepHeader: "1. Eng Katta Muammo",
            text: "\"Polipropilen quvurlarni o'rnatishda, ayniqsa fitinglarni ulashda sizni eng ko'p nima bezovta qiladi? Qaysi brenddagi fitinglar vaqtingizni eng ko'p oladi?\"",
          },
          { speaker: "operator", subStepHeader: "2. Tezlik va Qulaylik", text: "\"Quvurlarni to'g'ri o'rnatishda eng qulay, vaqtni tejaydigan brend kimniki?\"" },
        ],
      },
      {
        id: "ustalar-3",
        label: "Tavsiya va daromad motivatsiyasi",
        objectionIds: [],
        turns: [
          { speaker: "note", text: "(Bu savollar ustani bizning Usta Klubi dasturimizga qanday jalb qilish kerakligini aniqlaydi.)" },
          {
            speaker: "operator",
            text: "1. \"Mijozga biror brendni tavsiya qilganingizda, bu qarorni narxga asoslaysizmi, ishonchlilikka asoslaysizmi yoki siz uchun qo'shimcha rag'batlantirish (bonus) muhimmi?\"\n2. Ayni vaqtda qaysidur ishlab chiqaruvchi bilan rasmiy shartnoma asosida ishlaysizmi? Agar ishlayotgan bo'lsangiz ular sizga qanday taklif berishayapti.\n3. \"Siz uchun pul ko'rinishidagi tezkor bonus (cashback) yaxshimi, yoki ishingizni yengillashtiradigan qimmatbaho asboblar/texnikalar (masalan, yaxshi payvandlash uskunasi) yaxshiroqmi?\"\n4. \"Siz tavsiya qilgan mahsulot sotilgani uchun bonus olish jarayonini qanday tasavvur qilasiz? QR-kod orqali yoki do'kon tasdig'i orqali? Qaysi biri siz uchun qulay va ishonchli?\"",
          },
        ],
      },
      {
        id: "ustalar-4",
        label: "Bilim va qo'llab-quvvatlash ehtiyojlari",
        objectionIds: [],
        turns: [
          {
            speaker: "operator",
            text: "1. \"Polipropilen quvurlar bo'yicha yangi o'rnatish usullari yoki texnologiyalari haqida bepul seminar/master-klasslarda ishtirok etishga qanchalik qiziqasiz? Ular qaysi hududda o'tkazilsa, qulay bo'ladi?\"\n2. \"Qurilish mavsumi past bo'lgan paytda, WaterTech kompaniyasi sizga o'z kanallari orqali kichik buyurtmalar topishga yordam bersa, bu sizga qanchalik foydali bo'ladi?\"",
          },
        ],
      },
      {
        // Previously the closing paragraph below was buried as the last turn
        // of "ustalar-4" instead of being its own reachable stage — split
        // out so it can be navigated to directly, same as every other
        // script's closing stage.
        id: "ustalar-5",
        label: "Yakun",
        objectionIds: [],
        turns: [
          { speaker: "note", text: "(Yakunlovchi gap)" },
          {
            speaker: "operator",
            text: "____ aka korxonamiz viloyatlar va tumanlararo Santexnika mutaxassislari klubini tashkil qilayotgan edi, shu sababli sizdek mutaxassislarni fikrlarini eshitib xulosa qilish biz uchun juda muhim deb bildik, tez orada sizga taklif bilan chiqaman albatta.",
          },
        ],
      },
    ]),
  },
  {
    id: "qayta-aloqa",
    name: "Qayta aloqa",
    cheatSheet: "Eslatib o'tish → oxirgi suhbatni eslash → qaror holatini so'ra → to'sqinlik sababini aniqla → yordam taklif qil.",
    stages: chain([
      {
        id: "qayta-aloqa-1",
        label: "Savollar ro'yxati",
        objectionIds: [],
        turns: [
          {
            speaker: "operator",
            text: "1. Assalamu aleykum ____ aka yashimisiz, salomatmisiz? Men WaterTech kompaniyasidan ______man, siz bilan polipropilen quvurlar, fitinglar, kanalizatsiya quvurlari hamkorligi masalasida gaplashgan edik, esladingizmi?",
          },
          {
            speaker: "operator",
            text: "2. Oxirgi suhbatimizda (zapis eshitilib qaysi masala yuzasidan aloqaga chiqayotganingizni aniqlab aytasiz) ustam bilan o'ylab ko'rishimiz kerak deb aytgan edingiz, nima bo'ldi qanday qarorga keldingiz? Mahsulotimiz sifati, narxlarimiz sizga maqul keldimi?",
          },
          { speaker: "operator", text: "3. Qachon hamkorlik qilishni rejalashtirayapsiz?" },
          { speaker: "operator", text: "4. Hamkorlik qilishimiz uchun nimalar to'sqinlik qilmoqda?" },
          { speaker: "operator", text: "5. Qaysi ma'lumotlarni sizga to'g'ri va to'liq yetkazib bera olmadim?" },
          { speaker: "operator", text: "6. Takliflaringiz bo'lsa albatta eshitaman, sizga qanday yordam bera olaman?" },
        ],
      },
    ]),
  },
];
