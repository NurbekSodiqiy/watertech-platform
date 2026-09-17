import type { AdminContentBundle, CountableTable } from "@/lib/admin/queries";
import type { ContentBundle } from "@/lib/content/loader";
import type { Product } from "@/lib/content/products";

// Small, typed, DB-free content set shared by the unit tests. Unlocalised:
// raw *Ru twins stay on the objects, the way getContentBundleAdmin() returns
// them. Deliberately includes the broken cases the publish gate must catch:
//   - `sovuq-qongiroq` is a draft script
//   - `obj-oylab-koraman` references a script that doesn't exist
//   - `obj-chegirma` references the draft script
//   - `faq-kafolat` / `faq-kafolat-muddati` are near-duplicate questions

export const PUBLISHED_SCRIPT_ID = "lead-orqali-tushgan";
export const DRAFT_SCRIPT_ID = "sovuq-qongiroq";
export const MISSING_SCRIPT_ID = "ochirilgan-skript";

export const contentBundle: ContentBundle = {
  scripts: [
    {
      id: PUBLISHED_SCRIPT_ID,
      name: "Lead orqali tushgan",
      cheatSheet: "Salomlashing, ehtiyojni aniqlang, paket taklif qiling.",
      stages: [
        {
          id: "salomlashish",
          label: "Salomlashish",
          turns: [{ speaker: "operator", text: "Assalomu alaykum, WaterTech kompaniyasidan qo'ng'iroq qilyapman." }],
          objectionIds: [],
          nextStageId: "etiroz",
        },
        {
          id: "etiroz",
          label: "E'tiroz ustida ishlash",
          turns: [],
          objectionIds: ["obj-qimmat", "obj-chegirma", "obj-oylab-koraman"],
          nextStageId: "taklif",
        },
        {
          id: "taklif",
          label: "Taklif",
          turns: [
            {
              speaker: "operator",
              text: "Sizning hajmingizga Diler paketi mos keladi.",
              links: [{ label: "Diler paketi", type: "package", id: "pkg-diler" }],
            },
          ],
          objectionIds: [],
        },
      ],
      nameRu: "Входящий лид",
      cheatSheetRu: "Поздоровайтесь, выясните потребность, предложите пакет.",
    },
    {
      id: DRAFT_SCRIPT_ID,
      name: "Sovuq qo'ng'iroq",
      cheatSheet: "",
      stages: [
        {
          id: "salomlashish",
          label: "Salomlashish",
          turns: [{ speaker: "operator", text: "Assalomu alaykum, bir daqiqa vaqtingiz bormi?" }],
          objectionIds: [],
        },
      ],
    },
  ],
  objections: [
    {
      id: "obj-qimmat",
      label: "Narxi qimmat",
      keywords: ["qimmat", "narx"],
      clientSays: "Sizlarda narx qimmat ekan",
      realMeaning: "Mahsulot qiymatini hali ko'rmayapti",
      response: "Sifat sertifikati bor, trubalarga 10 yil kafolat beramiz.",
      followUp: "Buyurtma hajmini aniqlab olamizmi?",
      scriptIds: [PUBLISHED_SCRIPT_ID],
      labelRu: "Дорого",
      clientSaysRu: "У вас дорого",
      realMeaningRu: "Пока не видит ценности продукта",
      responseRu: "Есть сертификат качества, на трубы даём гарантию 10 лет.",
      followUpRu: "Уточним объём заказа?",
    },
    {
      id: "obj-chegirma",
      label: "Chegirma kam",
      keywords: ["chegirma", "skidka"],
      clientSays: "Boshqalar kattaroq chegirma beradi",
      realMeaning: "Shartlarni solishtirmoqda",
      response: "Diler paketida chegirma 15% gacha, nasiya ham bor.",
      scriptIds: [DRAFT_SCRIPT_ID],
    },
    {
      id: "obj-oylab-koraman",
      label: "O'ylab ko'raman",
      keywords: ["o'ylab"],
      clientSays: "O'ylab ko'raman, keyin aytaman",
      realMeaning: "Qaror qabul qilishga shoshmayapti",
      response: "Albatta. Qaysi savol ochiq qoldi, hozir aniqlab beraman.",
      scriptIds: [MISSING_SCRIPT_ID],
    },
  ],
  faqs: [
    {
      id: "faq-kafolat",
      category: "Umumiy",
      question: "Kafolat muddati qancha?",
      answer: "Trubalarga 10 yil kafolat beriladi.",
    },
    {
      // Same question re-entered with a typo — the kind of duplicate
      // noDuplicateFaq's Fuse threshold is tuned to catch.
      id: "faq-kafolat-muddati",
      category: "Umumiy",
      question: "Kafolat mudati qancha?",
      answer: "Kafolat 10 yil amal qiladi.",
    },
    {
      id: "faq-yetkazib-berish",
      category: "Logistika",
      question: "Yetkazib berish necha kunda?",
      answer: "Toshkent bo'ylab 3 ish kunida yetkazamiz.",
      questionRu: "За сколько дней доставка?",
      answerRu: "По Ташкенту доставляем за 3 рабочих дня.",
    },
  ],
  competitors: [
    {
      id: "aquaplast",
      name: "AquaPlast",
      assortment: "PPR trubalar va fitinglar",
      baseDiscount: "3%",
      volumeDiscount: "5%",
      retroBonus: "Yo'q",
      maxDiscount: "8%",
      paymentTerms: "100% oldindan",
      paymentMethod: "Bank o'tkazmasi",
      deliveryTime: "5 kun",
      logistics: "Samovyvoz",
      dealerCoverage: "Toshkent viloyati",
      certificates: "GOST",
      marketingOffers: "Mavsumiy aksiya",
      threatLevel: "O'rta",
    },
  ],
  packageGroups: [
    {
      id: "pg-diler",
      title: "Diler paketlari",
      subtitle: "Ulgurji xaridorlar uchun",
      titleRu: "Дилерские пакеты",
      subtitleRu: "Для оптовых покупателей",
      packages: [
        {
          id: "pkg-start",
          name: "Start paketi",
          isFeatured: false,
          orderVolume: "50 mln so'mdan",
          paymentTerms: "100% oldindan",
          estimatedDiscount: "~5% chegirma",
          discountPct: 5,
          advancePct: null,
          logistics: "Samovyvoz yoki yetkazib berish",
          deliveryTime: "3 ish kuni",
        },
        {
          id: "pkg-diler",
          name: "Diler paketi",
          isFeatured: true,
          orderVolume: "200 mln so'mdan",
          paymentTerms: "40% avans + 60% nasiya",
          estimatedDiscount: "~15% gacha chegirma",
          discountPct: 15,
          advancePct: 40,
          logistics: "Bepul yetkazib berish",
          deliveryTime: "2 ish kuni",
          nameRu: "Дилерский пакет",
          orderVolumeRu: "от 200 млн сумов",
          paymentTermsRu: "40% аванс + 60% рассрочка",
          estimatedDiscountRu: "скидка до ~15%",
          logisticsRu: "Бесплатная доставка",
          deliveryTimeRu: "2 рабочих дня",
        },
      ],
    },
  ],
};

export const products: Product[] = [
  {
    id: "truba-ppr",
    filename: "truba-ppr.jpg",
    name_ru: "Труба ППР",
    sizes: ["Ø20", "Ø25", "Ø32"],
    line: "ppr",
    category: "truba",
  },
  {
    id: "kran-sharovoy",
    filename: "kran-sharovoy.jpg",
    name_ru: "Кран шаровой",
    name_uz: "Sharli kran",
    sizes: ["1/2", "3/4"],
    line: "ppr",
    category: "kran",
    material: "latun",
  },
];

function ids(items: readonly { id: string }[]): string[] {
  return items.map((item) => item.id);
}

/** Everything is published except DRAFT_SCRIPT_ID. */
export function publishedIds(): Record<CountableTable, ReadonlySet<string>> {
  return {
    content_scripts: new Set(ids(contentBundle.scripts).filter((id) => id !== DRAFT_SCRIPT_ID)),
    content_objections: new Set(ids(contentBundle.objections)),
    content_faqs: new Set(ids(contentBundle.faqs)),
    content_competitors: new Set(ids(contentBundle.competitors)),
    content_package_groups: new Set(ids(contentBundle.packageGroups)),
    content_packages: new Set(contentBundle.packageGroups.flatMap((group) => ids(group.packages))),
    content_products: new Set(ids(products)),
  };
}

/** The publish gate's context (GateContext), as getContentBundleAdmin() builds it. */
export function gateContext(overrides: Partial<Record<CountableTable, ReadonlySet<string>>> = {}): AdminContentBundle {
  return { bundle: contentBundle, products, publishedIds: { ...publishedIds(), ...overrides } };
}

/** What lib/content/loader.ts's getContentBundle() would return: drafts dropped. */
export function publishedContentBundle(): ContentBundle {
  const published = publishedIds();
  return { ...contentBundle, scripts: contentBundle.scripts.filter((s) => published.content_scripts.has(s.id)) };
}

export function byId<T extends { id: string }>(items: readonly T[], id: string): T {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`fixture "${id}" not found`);
  return item;
}
