export interface ScriptTurn {
  speaker: 'operator' | 'mijoz' | 'note';
  text: string;
  subStepHeader?: string;
}

export interface ScriptStage {
  id: string;
  label: string;
  type: 'direct' | 'accordion';
  turns?: ScriptTurn[];
  subItems?: { id: string; label: string; turns: ScriptTurn[] }[];
}

export interface SalesScript {
  id: string;
  name: string;
  stages: ScriptStage[];
}

export const salesScriptsData: SalesScript[] = [
  {
    id: "target-leads",
    name: "Target orqali tushgan lidlar",
    stages: [
      {
        id: "stage-1",
        label: "Munosabat o'rnatish",
        type: "direct",
        turns: [
          {
            speaker: "operator",
            subStepHeader: "1.1 Kirish",
            text: "Assalamu aleykum, ______ aka yaxshimisiz?"
          },
          {
            speaker: "note",
            text: "(agar ismini yozmagan bo'lsa, murojaat qilish uchun ismingizni bilsam bo'ladimi?)"
          },
          {
            speaker: "mijoz",
            text: "Rahmat, yaxshi."
          },
          {
            speaker: "operator",
            text: "Mening ismim _______, WaterTech korxonasidan aloqaga chiqayapman. ______ aka Instagram/Facebook orqali issiq, sovuq va kanalizatsiya quvurlarimizga qiziqish bildirgan ekansiz, yodingizdami?"
          },
          {
            speaker: "mijoz",
            text: "Ha to'g'ri, qoldirganman."
          },
          {
            speaker: "operator",
            text: "Qiziqishingiz uchun rahmat. Murojaatingiz yuzasidan 2 daqiqa vaqtingizni olaman, qarshi emasmisiz?"
          },
          {
            speaker: "mijoz",
            text: "Albatta, eshitaman"
          },
          {
            speaker: "operator",
            subStepHeader: "1.2 Faoliyatni aniqlash",
            text: "Faoliyatingiz turini bilsam bo'ladimi ____ aka, santexnika do'koningiz bormi, ulgurji savdogarmisiz yoki qurilish kompaniyasi uchun xarid qilmoqchimisiz?"
          },
          {
            speaker: "mijoz",
            text: "(faoliyat turini aytadi)"
          },
          {
            speaker: "operator",
            text: "Qaysi manzilda joylashgan?"
          },
          {
            speaker: "note",
            text: "(do'kon, ombor, qurilish kompaniya)"
          },
          {
            speaker: "operator",
            subStepHeader: "1.3 QQS tasdig'i",
            text: "Tanishganimdan xursandman ____ aka. Siz do'kon rahbarimisiz yoki sotuvchi?"
          },
          {
            speaker: "note",
            text: "(agar qurilish kompaniyasidan bo'lsa, ta'minotchi bo'lishi kerak)"
          }
        ]
      },
      {
        id: "stage-2",
        label: "Ehtiyojni aniqlash",
        type: "direct",
        turns: [
          {
            speaker: "operator",
            subStepHeader: "2.1 Vaziyatni aniqlash",
            text: "Qancha vaqtdan beri ushbu faoliyat bilan shug'ullanasiz ____ aka? Shu vaqtgacha qaysi brendlar bilan ishladingiz va hozirgi yetkazib beruvchilaringiz kimlar, ya'ni qaysi brendlar bilan hamkorlikda ishlayapsiz."
          },
          {
            speaker: "operator",
            text: "Mahsulotlarimizga qiziqishingizdan kelib chiqib, siz asosan do'kon zaxirasi uchunmi, yoki aniq bir qurilish loyihasi uchun xarid qilyapsizmi?"
          },
          {
            speaker: "mijoz",
            text: "(javob beradi)"
          },
          {
            speaker: "operator",
            subStepHeader: "2.2 Muammoni aniqlash",
            text: "Raqobatchilarimiz bilan ishlashda sizni eng ko'p nima bezovta qiladi? Yetkazish muddati tez-tez buziladimi, yoki fitinglar sifati bilan bog'liq muammolar bormi?"
          },
          {
            speaker: "mijoz",
            text: "(agar muammo bo'lsa muammosini aytadi, yoki hammasi yaxshi deydi)"
          },
          {
            speaker: "operator",
            text: "Agar shu muammolarni bartaraf etsak, siz bizdan WaterTech quvur va fitinglardan o'rtacha oylik necha so'mlik hajmda xarid qilishni rejalashtiryapsiz yoki xarid qilgan bo'lar edingiz?"
          }
        ]
      },
      {
        id: "stage-3",
        label: "Mahsulot taqdimoti",
        type: "direct",
        turns: [
          {
            speaker: "operator",
            text: "____ aka, Sizning asosiy tashvishingiz [Mijoz Aytgan Og'riq Nuqtasi] ekanligini tushundim. Bu muammoni hal qilish uchun sizga ____ brendimizni tavsiya qilaman. Nega deysizmi?"
          },
          {
            speaker: "operator",
            subStepHeader: "1. Xususiyat (F)",
            text: "Bizning mahsulotlarimiz Germaniya texnologiyasi asosida asl polipropilendan yuqori aniqlikda ishlab chiqariladi. Boshqa brendlardagidek mel qo'shilmaydi."
          },
          {
            speaker: "operator",
            subStepHeader: "2. Afzallik (A)",
            text: "Bu shuni anglatadiki, bizning quvurlarimiz 5-7 bar yuqori bosimga va yuqori haroratga chidaydi. Eng asosiysi, siz bizdan 10 yil rasmiy kafolat va muammo bo'lsa tez almashtirish xizmatini olasiz."
          },
          {
            speaker: "operator",
            subStepHeader: "3. Foyda (B)",
            text: "Bu siz uchun bevosita IKKI NARSAni anglatadi:\n- Yo'qotilgan obro'ni tiklash: Ustalar va mijozlaringiz sizning do'koningizni eng ishonchli materiallar nuqtasi sifatida tavsiya qiladi (chunki muammo bo'lmaydi).\n- Xavfsiz oborot: Bizning 10 yillik yaroqlilik muddati va ISO/GOST sertifikatlari sizning mijozlaringizga uzoq muddatli kafolat beradi."
          },
          {
            speaker: "operator",
            text: "Keling, men sizga hozir praysimizni yuboraman, mahsulotlarimiz bilan tanishib chiqib raqobatchilarimiz bilan solishtirib ko'rishni tavsiya qilaman."
          }
        ]
      },
      {
        id: "stage-4",
        label: "Raqobatdan ustunligimiz",
        type: "direct",
        turns: [
          {
            speaker: "operator",
            text: "1. Bizning mahsulotlar 3 xil segment uchun ishlab chiqariladi: WaterTech, AquaPower va AquaTherm. Narxga emas, kompleks yechimga e'tibor qarating.\n2. Kafolat va qaytarish siyosati — mahsulotimizga 10 yil kafolat beramiz va muammo bo'lsa almashtirib beramiz.\n3. Ulgurji xaridorlarimiz uchun shaxsiy chegirmalar va bonuslarimiz mavjud."
          }
        ]
      },
      {
        id: "stage-5",
        label: "E'tiroz ustida ishlash",
        type: "accordion",
        subItems: [
          {
            id: "obj-qimmat",
            label: "Narxi qimmat",
            turns: [
              {
                speaker: "mijoz",
                text: "Narxi qimmat"
              },
              {
                speaker: "operator",
                text: "Tushunarli. Haqiqatan ham, sizga shunday tuyulayotgan bo'lishi mumkin. Lekin biz faqat narxni emas, balki xavfsizlikni sotyapmiz. Hozirgi arzon quvurlar tufayli bir yilda necha marta qaytarish yoki shikoyatlar bilan pul yo'qotishingiz mumkin? Bizning narximiz – bu sizning obro'ingizga berilgan sug'urta."
              }
            ]
          },
          {
            id: "obj-fitting",
            label: "Fitinglar mos kelmaydi",
            turns: [
              {
                speaker: "mijoz",
                text: "Fitinglar bir-biriga tushmaydi"
              },
              {
                speaker: "operator",
                text: "Bu juda muhim savol. Bizning fitinglarimiz Yevropa standartlarida aniq kalibrovka qilingan. Bu esa ustalar uchun tezkor va xatosiz o'rnatishni ta'minlaydi. Biz buning uchun maxsus kafolat beramiz. Menejerimizning sinov to'plamini tekshirib ko'ring."
              }
            ]
          },
          {
            id: "obj-think",
            label: "O'ylab ko'raman",
            turns: [
              {
                speaker: "mijoz",
                text: "Mayli, rahmat, hozir o'ylab ko'ray..."
              },
              {
                speaker: "operator",
                text: "Albatta, o'ylab ko'rish kerak. Lekin vaqtingizni tejash uchun to'g'ridan-to'g'ri aniqlashtiray: sizni hozir eng ko'p to'xtatib turgan narsa – narxmi, yoki nasiya shartlari haqidagi savollaringizmi? Sizga qanday ma'lumotni to'liq va to'g'ri yetkazib bera olmadim?"
              }
            ]
          },
          {
            id: "obj-risk",
            label: "Risk qila olmayman",
            turns: [
              {
                speaker: "mijoz",
                text: "Risk qila olmayman"
              },
              {
                speaker: "operator",
                text: "Ustalar bilan hamkorlik asosida ishlashni yo'lga qo'ymoqdamiz, shu sababli har bir tumanda bizning mahsulotlarimiz bo'lishi kerak, o'zizga ham ma'lumki bu mahsulotga talab yuqori. Mijoz tomonidan xavotir olmasangiz ham bo'ladi. Marketing tomondan, ya'ni mijozlarni jalb qilish masalasini biz hal qilamiz."
              }
            ]
          }
        ]
      },
      {
        id: "stage-6",
        label: "Yakuniy qadam",
        type: "direct",
        turns: [
          {
            speaker: "operator",
            subStepHeader: "1. Aniq qayta aloqa vaqti",
            text: "Sizga yakshanba 14:00 yoki dushanba 10:00 qayta aloqaga chiqsam qulay bo'ladimi?"
          },
          {
            speaker: "operator",
            subStepHeader: "2. Ofisga taklif",
            text: "Narx shartlarini joyida, barcha hujjatlar bilan ko'rib chiqish uchun, ofisimizga tashrif buyursangiz qulayroq bo'lardi. Siz uchun alohida menejer biriktirib, ishlab chiqarish zavodimizga ekskursiya tashkil qilib beraman. Bu mahsulotlarimizni bemalol istalgan usulda sifatini tekshirib ko'rishingizga imkoniyat yaratadi. Tashrif kuningizni aytsangiz men belgilab qo'yaman va bir kun oldin aloqaga chiqib eslatib qo'yaman. Sizga _____ kuni [soat] yoki ____ kuni [soat] maqul bo'ladimi?"
          },
          {
            speaker: "operator",
            subStepHeader: "3. Namuna yuborish kafolati",
            text: "Katta buyurtma berishdan avval sifatga ishonch hosil qilish tabiiy. Sizga fitinglarimiz va trubalarimizning namunasini yuboramiz. Istalgan usulda tekshirib ko'rishingiz mumkin. Biz sifatimizga kafolat beramiz."
          },
          {
            speaker: "operator",
            subStepHeader: "4. Menejer taklifi",
            text: "Biz sizga yuqorida aytilgan kafolatlar va keng assortimentni taqdim eta olamiz. Endi gap faqat moliyaviy shartlarda qoldi. Sizning hajmga mos shaxsiy chegirmalarni (ulgurji xaridor sifatida) va moslashuvchan to'lov usullarini (muddatli to'lov/nasiya) muhokama qilish uchun sizga mutaxassis (menejerimiz) bilan qisqa uchrashuv rejalashtiraylik.\n\nMenejerimizga [Kun va Vaqt] yoki [Boshqa Kun va Vaqt] qulay bo'ladi? Ular shaxsan borib, barcha hujjatlar, sertifikatlar va sinov to'plamini olib borishadi."
          },
          {
            speaker: "note",
            text: "MUHIM: \"O'ylab ko'raman\" yoki \"Keyinroq telefon qilaman\" kabi maqsadsiz javoblar qabul qilinmaydi — operator aniq kun/vaqt bilan yakunlashi shart."
          }
        ]
      }
    ]
  }
];