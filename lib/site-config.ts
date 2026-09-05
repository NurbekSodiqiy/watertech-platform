import type { NavNode, PageMeta } from "./types";

export const siteTree: NavNode[] = [
  {
    title: "Company",
    path: "/company",
    contentType: "doc",
    description: "Who we are, how we work, and where to find internal facts.",
    children: [
      { title: "About", path: "/company/about", contentType: "doc" },
      { title: "Mission & Values", path: "/company/mission-values", contentType: "doc" },
      { title: "Org Chart", path: "/company/org-chart", contentType: "doc" },
      { title: "Contacts", path: "/company/contacts", contentType: "database" },
      { title: "Internal Rules", path: "/company/internal-rules", contentType: "doc" },
      { title: "Production Facts", path: "/company/production-facts", contentType: "doc" },
      { title: "Factory Tour", path: "/company/factory-tour", contentType: "video" },
    ],
  },
  {
    title: "Product & Pricing",
    path: "/products",
    contentType: "database",
    description: "Full catalog, technical documentation, pricing, and comparisons.",
    children: [
      { title: "Catalog", path: "/products", contentType: "database" },
      { title: "Lines Map", path: "/products/lines-map", contentType: "doc" },
      { title: "Price Sheet", path: "/products/price-sheet", contentType: "doc" },
      { title: "Discount Policy", path: "/products/discount-policy", contentType: "doc" },
      { title: "Comparisons", path: "/products/comparisons", contentType: "doc" },
      { title: "Technical Docs", path: "/products/technical-docs", contentType: "doc" },
      { title: "Warranty & Service", path: "/products/warranty-service", contentType: "doc" },
      { title: "Technical FAQ", path: "/products/technical-faq", contentType: "database" },
      { title: "Roadmap", path: "/products/roadmap", contentType: "doc", locked: true },
    ],
  },
  {
    title: "Customer",
    path: "/customers",
    contentType: "doc",
    description: "Who we sell to, how they decide, and what has worked before.",
    children: [
      { title: "Ideal Customer Profile", path: "/customers/icp", contentType: "doc" },
      { title: "Segments", path: "/customers/segments", contentType: "database" },
      { title: "Decision Chain", path: "/customers/decision-chain", contentType: "doc" },
      { title: "Journey Map", path: "/customers/journey-map", contentType: "doc" },
      { title: "Case Studies", path: "/customers/case-studies", contentType: "database" },
      { title: "Working Principles", path: "/customers/working-principles", contentType: "doc" },
      { title: "Lost Deals Analysis", path: "/customers/lost-deals-analysis", contentType: "doc" },
    ],
  },
  {
    title: "Sales Process",
    path: "/sales-process",
    contentType: "doc",
    description: "The funnel, scripts, objection handling, and deal mechanics.",
    children: [
      { title: "Funnel Map", path: "/sales-process/funnel-map", contentType: "doc" },
      { title: "Lead Sources", path: "/sales-process/lead-sources", contentType: "doc" },
      { title: "Lead Qualification", path: "/sales-process/lead-qualification", contentType: "doc" },
      { title: "Scripts", path: "/sales-process/scripts", contentType: "database" },
      { title: "Objections", path: "/sales-process/objections", contentType: "database" },
      { title: "Battle Cards", path: "/sales-process/battle-cards", contentType: "database" },
      { title: "Proposal & Invoice", path: "/sales-process/proposal-invoice", contentType: "doc" },
      { title: "Contract Terms", path: "/sales-process/contract-terms", contentType: "doc" },
      { title: "Payment Terms", path: "/sales-process/payment-terms", contentType: "doc" },
      { title: "Negotiation & Discount", path: "/sales-process/negotiation-discount", contentType: "doc" },
      { title: "Post-Close Follow-up", path: "/sales-process/post-close-followup", contentType: "doc" },
      { title: "Tender & Procurement", path: "/sales-process/tender-procurement", contentType: "doc" },
    ],
  },
  {
    title: "Programs & Tools",
    path: "/tools",
    contentType: "doc",
    description: "Software, CRM standard operating procedures, and troubleshooting.",
    children: [
      { title: "Software List", path: "/tools/software-list", contentType: "doc" },
      {
        title: "amoCRM",
        path: "/tools/amocrm",
        contentType: "doc",
        children: [
          { title: "Lead Creation", path: "/tools/amocrm/lead-creation", contentType: "doc" },
          { title: "Stage Transition", path: "/tools/amocrm/stage-transition", contentType: "doc" },
          { title: "Task Setting", path: "/tools/amocrm/task-setting", contentType: "doc" },
          { title: "Card Standard", path: "/tools/amocrm/card-standard", contentType: "doc" },
          { title: "Loss Reasons", path: "/tools/amocrm/loss-reasons", contentType: "doc" },
          { title: "Reports", path: "/tools/amocrm/reports", contentType: "doc" },
        ],
      },
      { title: "Google Sheets", path: "/tools/google-sheets", contentType: "doc" },
      { title: "Communication Standards", path: "/tools/communication-standards", contentType: "doc" },
      { title: "Troubleshooting", path: "/tools/troubleshooting", contentType: "doc" },
    ],
  },
  {
    title: "Logistics",
    path: "/logistics",
    contentType: "doc",
    description: "Delivery, transport, returns, and stock information.",
    children: [
      { title: "Delivery Terms", path: "/logistics/delivery-terms", contentType: "doc" },
      { title: "Transport Capacity", path: "/logistics/transport-capacity", contentType: "doc" },
      { title: "Sample Shipping", path: "/logistics/sample-shipping", contentType: "doc" },
      { title: "Returns Policy", path: "/logistics/returns-policy", contentType: "doc" },
      { title: "Stock Check", path: "/logistics/stock-check", contentType: "doc" },
      { title: "Documents", path: "/logistics/documents", contentType: "doc" },
    ],
  },
  {
    title: "Standards, KPI & Motivation",
    path: "/standards",
    contentType: "doc",
    description: "How performance is measured, rewarded, and grown.",
    children: [
      { title: "Daily Checklist", path: "/standards/daily-checklist", contentType: "checklist" },
      { title: "Weekly / Monthly Checklist", path: "/standards/weekly-monthly-checklist", contentType: "checklist" },
      { title: "Communication Standards", path: "/standards/communication-standards", contentType: "doc" },
      { title: "Roles & Responsibilities", path: "/standards/roles-responsibilities", contentType: "doc" },
      { title: "One-Pager Guide", path: "/standards/onepager-guide", contentType: "doc" },
      { title: "KPI System", path: "/standards/kpi-system", contentType: "doc" },
      { title: "KPI Dashboard", path: "/standards/kpi-dashboard", contentType: "database", locked: true },
      { title: "Motivation & Bonus", path: "/standards/motivation-bonus", contentType: "doc" },
      { title: "Career Path", path: "/standards/career-path", contentType: "doc" },
    ],
  },
  {
    title: "Academy",
    path: "/academy",
    contentType: "doc",
    description: "Onboarding, training modules, certifications, and skill growth.",
    children: [
      { title: "Learning Paths", path: "/academy/learning-paths", contentType: "doc" },
      { title: "Modules", path: "/academy/modules", contentType: "database" },
      { title: "Certifications", path: "/academy/certifications", contentType: "doc" },
      { title: "Best Calls Library", path: "/academy/best-calls-library", contentType: "video" },
      { title: "Roleplay Recordings", path: "/academy/roleplay-recordings", contentType: "video" },
      { title: "Recommended Reading", path: "/academy/recommended-reading", contentType: "doc" },
      { title: "Leaderboard & Badges", path: "/academy/leaderboard-badges", contentType: "doc" },
    ],
  },
  {
    title: "FAQ",
    path: "/faq",
    contentType: "database",
    description: "Frequently asked questions across every topic.",
  },
  {
    title: "Changelog",
    path: "/changelog",
    contentType: "doc",
    description: "What changed, when, and who needs to acknowledge it.",
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

const OWNERS = ["Sales Enablement", "Head of Sales", "Product Marketing", "Operations Lead"];
const APPROVERS = ["A. Kessler", "M. Ivanova", "T. Baxter", "Head of Sales"];
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
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
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
