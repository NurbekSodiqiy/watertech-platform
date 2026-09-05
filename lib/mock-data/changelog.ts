export interface ChangelogEntry {
  id: string;
  date: string;
  whatChanged: string;
  linkedPage: string;
  approvedBy: string;
  readCount: string;
}

export const changelogEntries: ChangelogEntry[] = [
  { id: "cl-1", date: "2026-09-02", whatChanged: "[Placeholder — updated discount tiers.]", linkedPage: "/products/discount-policy", approvedBy: "Head of Sales", readCount: "12 / 18" },
  { id: "cl-2", date: "2026-08-28", whatChanged: "[Placeholder — added new battle card.]", linkedPage: "/sales-process/battle-cards", approvedBy: "M. Ivanova", readCount: "16 / 18" },
  { id: "cl-3", date: "2026-08-20", whatChanged: "[Placeholder — revised delivery terms.]", linkedPage: "/logistics/delivery-terms", approvedBy: "Operations Lead", readCount: "18 / 18" },
  { id: "cl-4", date: "2026-08-11", whatChanged: "[Placeholder — new onboarding module published.]", linkedPage: "/academy/modules", approvedBy: "A. Kessler", readCount: "9 / 18" },
  { id: "cl-5", date: "2026-08-03", whatChanged: "[Placeholder — updated warranty policy.]", linkedPage: "/products/warranty-service", approvedBy: "Head of Sales", readCount: "18 / 18" },
];
