export interface Competitor {
  id: string;
  name: string;
  assortment: string;
  baseDiscount: string;
  volumeDiscount: string;
  retroBonus: string;
  maxDiscount: string;
  paymentTerms: string;
  paymentMethod: string;
  deliveryTime: string;
  logistics: string;
  dealerCoverage: string;
  certificates: string;
  marketingOffers: string;
  threatLevel: "Yuqori" | "O'rta" | "Ma'lumot yo'q";
}

export const competitorsData: Competitor[] = [
  {
    id: "alfa-therm",
    name: "AlfaTherm",
    assortment: "Smesitel, Bak (3000L), PPR quvur va fitinglar",
    baseDiscount: "15%",
    volumeDiscount: "10%",
    retroBonus: "0%",
    maxDiscount: "25%",
    paymentTerms: "1-2 to'lov 100% oldindan; keyin 50/50 kelishiladi",
    paymentMethod: "Naqd va Perechisleniye",
    deliveryTime: "2.5 kun",
    logistics: "1 fura hajmda yetkazish tekin; kichik hajmga yordam beriladi",
    dealerCoverage: "Dilersiz — to'g'ridan-to'g'ri zavod skladidan do'konlarga sotadi, diler bermaydi",
    certificates: "UzTest sertifikati, SES xulosasi (baklar uchun)",
    marketingOffers: "Ball tizimi — Texnika, Avtomobil, Sayohatlar ilovasida aksiya bor, 1 bal texnika sotib olsa beriladi, 8000 balga Prado va boshqa katta sovrinlar bor",
    threatLevel: "Yuqori"
  },
  {
    id: "plas-therm",
    name: "PlasTherm",
    assortment: "PPR fitinglar, kanalizatsiya va santexnika uskunalari",
    baseDiscount: "17%",
    volumeDiscount: "0%",
    retroBonus: "3%",
    maxDiscount: "20%",
    paymentTerms: "1-xarid 100% oldindan; keyinchalik shartnoma tuzsa nasiya/muddatli bo'lishi mumkin",
    paymentMethod: "Naqd va Perechisleniye",
    deliveryTime: "4 kun",
    logistics: "Kamida 20 m³ (4 t) olinsa bepul yetkaziladi; zavod narxida olish uchun ham kamida 4 tonna bo'lishi kerak",
    dealerCoverage: "Dilerlik yo'q — hududiy eksklyuzivlik berilmaydi, to'g'ridan-to'g'ri zavod bilan savdo",
    certificates: "GOST 32415-2013, UzTest sertifikati, ISO 9001",
    marketingOffers: "Ustalar mobil ilovasida keshbek; fasad reklama. Yillik bonusga chiqish uchun 240 000 $ aylanma bo'lishi kerak",
    threatLevel: "Yuqori"
  },
  {
    id: "fox-pipes",
    name: "Fox Pipes",
    assortment: "PPR va PE quvurlar, fitinglar, sug'orish tizimlari",
    baseDiscount: "25%",
    volumeDiscount: "0%",
    retroBonus: "1.5%",
    maxDiscount: "26.5%",
    paymentTerms: "2 oy naqd, 3-oydan boshlab 70/30 muddatli to'lov",
    paymentMethod: "Naqd va Perechisleniye",
    deliveryTime: "7 kun",
    logistics: "1 fura xaridda viloyat markazigacha yetkazish bepul",
    dealerCoverage: "Barcha hududlar (Namangan va Farg'onada diler yo'q)",
    certificates: "GOST (PPR/PE), UzTest sertifikati, ISO 9001",
    marketingOffers: "1 yillik aylanmadan 1.5% yillik keshbek; barcha mahsulotga chegirmalar, eng katta PPR chegirmasi 25%",
    threatLevel: "O'rta"
  },
  {
    id: "asia-plas",
    name: "Asia Plas",
    assortment: "PPR va kanalizatsiya quvurlari, to'liq fitinglar",
    baseDiscount: "20%",
    volumeDiscount: "0%",
    retroBonus: "0%",
    maxDiscount: "20%",
    paymentTerms: "1 oyga muddatli to'lov (shartnoma asosida)",
    paymentMethod: "Perechisleniye QQS",
    deliveryTime: "2 kun",
    logistics: "Yetkazib berish xizmati bepul; zavod narxida mahsulot kamida 10–20 mln bo'lishi kerak",
    dealerCoverage: "Barcha viloyatlarda rasmiy dilerlik tarmog'i mavjud, Vodiyda (Farg'ona, Namangan, Andijon) yo'q, Qo'qonda katta sklad mavjud",
    certificates: "GOST 32415-2013, UzTest sertifikati, UzEX (Birja)",
    marketingOffers: "Oyiga 600 mln so'mga sayohat; kvartaliga 2.5 mlrd so'mga labo prays-listidagi barcha tovarlarga 20% gacha chegirmalar",
    threatLevel: "Yuqori"
  },
  {
    id: "sheffaf-plas",
    name: "Sheffaf Plas",
    assortment: "PPR quvurlar, ichimlik suvi quvurlari, fitinglar",
    baseDiscount: "0%",
    volumeDiscount: "20%",
    retroBonus: "0%",
    maxDiscount: "20%",
    paymentTerms: "Boshida 100% bank oldindan to'lov; keyin hajmga qarab",
    paymentMethod: "Perechisleniye QQS",
    deliveryTime: "15 kun",
    logistics: "Buyurtma summasiga qarab logistikaga yordam beriladi",
    dealerCoverage: "Barcha hududlar (Nukusda rasmiy diler yo'q)",
    certificates: "GOST muvofiqlik sertifikati",
    marketingOffers: "Dilerlik hajmiga qarab maxsus chegirmalar",
    threatLevel: "O'rta"
  },
  {
    id: "jip-plas",
    name: "Jip Plas",
    assortment: "Polipropilen quvurlar va standart santexnika fitinglari",
    baseDiscount: "Ma'lumot yo'q",
    volumeDiscount: "Ma'lumot yo'q",
    retroBonus: "Ma'lumot yo'q",
    maxDiscount: "Ma'lumot yo'q",
    paymentTerms: "Ma'lumot yo'q",
    paymentMethod: "Perechisleniye QQS",
    deliveryTime: "Ma'lumot yo'q",
    logistics: "Ma'lumot yo'q",
    dealerCoverage: "Ma'lumot yo'q",
    certificates: "Ma'lumot yo'q",
    marketingOffers: "Ma'lumot yo'q",
    threatLevel: "Ma'lumot yo'q"
  }
];