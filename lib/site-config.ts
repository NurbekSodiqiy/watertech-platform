import type { NavNode } from "./types";

export const siteTree: NavNode[] = [
  {
    title: "Jonli skript va yordamchi",
    path: "/sales-process/scripts",
    contentType: "doc",
    description: "Faol qo'ng'iroq paytida tez kirish uchun eng yuqorida — skriptlar, e'tirozlar, paketlar va raqobatchilar bir joyda.",
  },
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
      { title: "Taqqoslash", path: "/products/comparisons", contentType: "doc" },
      { title: "Texnik hujjatlar", path: "/products/technical-docs", contentType: "doc" },
      { title: "Rivojlanish rejasi", path: "/products/roadmap", contentType: "doc", locked: true },
    ],
  },
  {
    title: "Savdo jarayoni",
    path: "/sales-process",
    contentType: "doc",
    description: "Voronka, skriptlar, e'tirozlar bilan ishlash va bitim mexanikasi.",
    children: [
      { title: "E'tirozlar", path: "/sales-process/objections", contentType: "database" },
      { title: "Raqobat kartalari", path: "/sales-process/battle-cards", contentType: "database" },
    ],
  },
  {
    title: "Dasturlar va vositalar",
    path: "/tools",
    contentType: "doc",
    description: "Dasturiy ta'minot, CRM standart tartib-qoidalari va muammolarni bartaraf etish.",
    children: [
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
      { title: "Partiya kalkulyatori", path: "/tools/calculator", contentType: "doc" },
      { title: "Google Sheets", path: "/tools/google-sheets", contentType: "doc" },
      { title: "amoCRM qo'llanmasi", path: "/tools/communication-standards", contentType: "doc" },
      { title: "Sotuv varonkasi", path: "/tools/sales-funnel", contentType: "doc" },
      { title: "Qayta sotuv", path: "/tools/repeat-sales-funnel", contentType: "doc" },
    ],
  },
  {
    title: "Logistika",
    path: "/logistics",
    contentType: "doc",
    description: "Yetkazib berish, transport, qaytarish va ombor ma'lumotlari.",
    children: [
      { title: "Namuna yuborish", path: "/logistics/sample-shipping", contentType: "doc" },
      { title: "Qaytarish siyosati", path: "/logistics/returns-policy", contentType: "doc" },
    ],
  },
  {
    title: "Standartlar, KPI va motivatsiya",
    path: "/standards",
    contentType: "doc",
    description: "Natijalar qanday o'lchanadi, taqdirlanadi va rivojlantiriladi.",
    children: [
      { title: "Muloqot standartlari", path: "/standards/communication-standards", contentType: "doc" },
      { title: "KPI tizimi", path: "/standards/kpi-system", contentType: "doc" },
      { title: "Motivatsiya va bonus", path: "/standards/motivation-bonus", contentType: "doc" },
      { title: "Karyera yo'li", path: "/standards/career-path", contentType: "doc" },
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


