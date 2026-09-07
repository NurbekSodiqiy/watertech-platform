import type { NavNode, PageMeta } from "./types";

export const siteTree: NavNode[] = [
  {
    title: "Kompaniya",
    path: "/company",
    contentType: "doc",
    description: "Biz kimmiz, qanday ishlaymiz va ichki ma'lumotlarni qayerdan topish mumkin.",
    children: [
      { title: "Kompaniya haqida", path: "/company/about", contentType: "doc" },
      { title: "Missiya va qadriyatlar", path: "/company/mission-values", contentType: "doc" },
      { title: "Onboarding", path: "/company/onboarding", contentType: "doc" },
      { title: "Kontaktlar", path: "/company/contacts", contentType: "database" },
      { title: "Ichki qoidalar", path: "/company/internal-rules", contentType: "doc" },
      { title: "Ishlab chiqarish ma'lumotlari", path: "/company/production-facts", contentType: "doc" },
      { title: "Zavod bo'ylab sayohat", path: "/company/factory-tour", contentType: "video" },
    ],
  },
  {
    title: "Mahsulot va narx",
    path: "/products",
    contentType: "database",
    description: "To'liq katalog, texnik hujjatlar, narxlar va taqqoslashlar.",
    children: [
      { title: "Katalog", path: "/products", contentType: "database" },
      { title: "Mahsulot turkumlari", path: "/products/lines-map", contentType: "doc" },
      { title: "Narxnoma", path: "/products/price-sheet", contentType: "doc" },
      { title: "Chegirma siyosati", path: "/products/discount-policy", contentType: "doc" },
      { title: "Taqqoslash", path: "/products/comparisons", contentType: "doc" },
      { title: "Texnik hujjatlar", path: "/products/technical-docs", contentType: "doc" },
      { title: "Kafolat va xizmat", path: "/products/warranty-service", contentType: "doc" },
      { title: "Texnik savol-javob", path: "/products/technical-faq", contentType: "database" },
      { title: "Rivojlanish rejasi", path: "/products/roadmap", contentType: "doc", locked: true },
    ],
  },
  {
    title: "Mijoz",
    path: "/customers",
    contentType: "doc",
    description: "Kimga sotamiz, ular qanday qaror qabul qiladi va ilgari nima natija bergan.",
    children: [
      { title: "Ideal mijoz profili", path: "/customers/icp", contentType: "doc" },
      { title: "Segmentlar", path: "/customers/segments", contentType: "database" },
      { title: "Qaror zanjiri", path: "/customers/decision-chain", contentType: "doc" },
      { title: "Mijoz yo'li", path: "/customers/journey-map", contentType: "doc" },
      { title: "Amaliy holatlar", path: "/customers/case-studies", contentType: "database" },
      { title: "Ish tamoyillari", path: "/customers/working-principles", contentType: "doc" },
      { title: "Yo'qotilgan bitimlar tahlili", path: "/customers/lost-deals-analysis", contentType: "doc" },
    ],
  },
  {
    title: "Savdo jarayoni",
    path: "/sales-process",
    contentType: "doc",
    description: "Voronka, skriptlar, e'tirozlar bilan ishlash va bitim mexanikasi.",
    children: [
      { title: "Voronka xaritasi", path: "/sales-process/funnel-map", contentType: "doc" },
      { title: "Lid manbalari", path: "/sales-process/lead-sources", contentType: "doc" },
      { title: "Lidlarni saralash", path: "/sales-process/lead-qualification", contentType: "doc" },

      { title: "E'tirozlar", path: "/sales-process/objections", contentType: "database" },
      { title: "Raqobat kartalari", path: "/sales-process/battle-cards", contentType: "database" },
      { title: "Taklif va hisob-faktura", path: "/sales-process/proposal-invoice", contentType: "doc" },
      { title: "Shartnoma shartlari", path: "/sales-process/contract-terms", contentType: "doc" },
      { title: "To'lov shartlari", path: "/sales-process/payment-terms", contentType: "doc" },
      { title: "Muzokara va chegirma", path: "/sales-process/negotiation-discount", contentType: "doc" },
      { title: "Bitimdan keyingi kuzatuv", path: "/sales-process/post-close-followup", contentType: "doc" },
      { title: "Tender va xarid", path: "/sales-process/tender-procurement", contentType: "doc" },
    ],
  },
  {
    title: "Dasturlar va vositalar",
    path: "/tools",
    contentType: "doc",
    description: "Dasturiy ta'minot, CRM standart tartib-qoidalari va muammolarni bartaraf etish.",
    children: [
      { title: "Dasturlar ro'yxati", path: "/tools/software-list", contentType: "doc" },
      {
        title: "amoCRM",
        path: "/tools/amocrm",
        contentType: "doc",
        children: [
          { title: "Lid yaratish", path: "/tools/amocrm/lead-creation", contentType: "doc" },
          { title: "Bosqichni almashtirish", path: "/tools/amocrm/stage-transition", contentType: "doc" },
          { title: "Vazifa belgilash", path: "/tools/amocrm/task-setting", contentType: "doc" },
          { title: "Karta standarti", path: "/tools/amocrm/card-standard", contentType: "doc" },
          { title: "Yo'qotish sabablari", path: "/tools/amocrm/loss-reasons", contentType: "doc" },
          { title: "Hisobotlar", path: "/tools/amocrm/reports", contentType: "doc" },
        ],
      },
      { title: "Google Sheets", path: "/tools/google-sheets", contentType: "doc" },
      { title: "Muloqot standartlari", path: "/tools/communication-standards", contentType: "doc" },
      { title: "Muammolarni bartaraf etish", path: "/tools/troubleshooting", contentType: "doc" },
    ],
  },
  {
    title: "Logistika",
    path: "/logistics",
    contentType: "doc",
    description: "Yetkazib berish, transport, qaytarish va ombor ma'lumotlari.",
    children: [
      { title: "Yetkazib berish shartlari", path: "/logistics/delivery-terms", contentType: "doc" },
      { title: "Transport imkoniyatlari", path: "/logistics/transport-capacity", contentType: "doc" },
      { title: "Namuna yuborish", path: "/logistics/sample-shipping", contentType: "doc" },
      { title: "Qaytarish siyosati", path: "/logistics/returns-policy", contentType: "doc" },
      { title: "Ombordagi qoldiq", path: "/logistics/stock-check", contentType: "doc" },
      { title: "Hujjatlar", path: "/logistics/documents", contentType: "doc" },
    ],
  },
  {
    title: "Standartlar, KPI va motivatsiya",
    path: "/standards",
    contentType: "doc",
    description: "Natijalar qanday o'lchanadi, taqdirlanadi va rivojlantiriladi.",
    children: [
      { title: "Kunlik nazorat ro'yxati", path: "/standards/daily-checklist", contentType: "checklist" },
      { title: "Haftalik / Oylik nazorat ro'yxati", path: "/standards/weekly-monthly-checklist", contentType: "checklist" },
      { title: "Call Operator", path: "/standards/call-operator", contentType: "doc" },
      { title: "Muloqot standartlari", path: "/standards/communication-standards", contentType: "doc" },
      { title: "Rollar va mas'uliyatlar", path: "/standards/roles-responsibilities", contentType: "doc" },
      { title: "Qisqa qo'llanma", path: "/standards/onepager-guide", contentType: "doc" },
      { title: "KPI tizimi", path: "/standards/kpi-system", contentType: "doc" },
      { title: "KPI paneli", path: "/standards/kpi-dashboard", contentType: "database", locked: true },
      { title: "Motivatsiya va bonus", path: "/standards/motivation-bonus", contentType: "doc" },
      { title: "Karyera yo'li", path: "/standards/career-path", contentType: "doc" },
    ],
  },
  {
    title: "Akademiya",
    path: "/academy",
    contentType: "doc",
    description: "Moslashuv, o'quv modullari, sertifikatlar va ko'nikmalar rivoji.",
    children: [
      { title: "O'quv yo'nalishlari", path: "/academy/learning-paths", contentType: "doc" },
      { title: "Modullar", path: "/academy/modules", contentType: "database" },
      { title: "Sertifikatlar", path: "/academy/certifications", contentType: "doc" },
      { title: "Eng yaxshi qo'ng'iroqlar to'plami", path: "/academy/best-calls-library", contentType: "video" },
      { title: "Rolli o'yin yozuvlari", path: "/academy/roleplay-recordings", contentType: "video" },
      { title: "Tavsiya etilgan adabiyotlar", path: "/academy/recommended-reading", contentType: "doc" },
      { title: "Reyting va nishonlar", path: "/academy/leaderboard-badges", contentType: "doc" },
      { title: "Bilim testi", path: "/academy/quiz", contentType: "quiz" },
    ],
  },
  {
    title: "Savol-javob",
    path: "/faq",
    contentType: "database",
    description: "Barcha mavzular bo'yicha ko'p beriladigan savollar.",
  },
  {
    title: "O'zgarishlar tarixi",
    path: "/changelog",
    contentType: "doc",
    description: "Nima o'zgardi, qachon o'zgardi va kim bilishi kerak.",
  },
];

export function flattenTree(nodes: NavNode[] = siteTree): NavNode[] {
  const out: NavNode[] = [];
  for (const node of nodes) {
    out.push(node);
    if (node.children) out.push(...flattenTree(node.children));
  }
  return out;
}

export function findNode(path: string): NavNode | undefined {
  return flattenTree().find((n) => n.path === path);
}

export function getBreadcrumbs(path: string): NavNode[] {
  const segments = path.split("/").filter(Boolean);
  const crumbs: NavNode[] = [];
  let current = "";
  for (const seg of segments) {
    current += `/${seg}`;
    const node = findNode(current);
    if (node) crumbs.push(node);
  }
  return crumbs;
}

const OWNERS = ["Savdoni qo'llab-quvvatlash", "Savdo bo'limi boshlig'i", "Mahsulot marketingi", "Operatsiyalar rahbari"];
const APPROVERS = ["A. Kessler", "M. Ivanova", "T. Baxter", "Savdo bo'limi boshlig'i"];
const AUDIENCES: PageMeta["audience"][] = ["Operator", "Manager", "Head"];
const LEVELS: PageMeta["level"][] = ["Basic", "Intermediate", "Expert"];
const STATUSES: PageMeta["status"][] = ["up-to-date", "in-review", "outdated"];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function getMockMeta(path: string): PageMeta {
  const h = hashString(path);
  const updated = new Date(2026, (h % 12), (h % 27) + 1);
  const review = new Date(updated);
  review.setMonth(review.getMonth() + 3);
  const UZ_MONTHS = ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"];
  const fmt = (d: Date) => `${d.getDate()}-${UZ_MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
  return {
    owner: OWNERS[h % OWNERS.length],
    approvedBy: APPROVERS[(h >> 2) % APPROVERS.length],
    updatedDate: fmt(updated),
    nextReviewDate: fmt(review),
    audience: AUDIENCES[(h >> 4) % AUDIENCES.length],
    level: LEVELS[(h >> 6) % LEVELS.length],
    status: STATUSES[(h >> 8) % STATUSES.length],
  };
}
