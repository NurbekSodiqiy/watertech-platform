export type ContentType = "doc" | "database" | "video" | "checklist" | "quiz";

export type Audience = "Operator" | "Manager" | "Head";
export type Level = "Basic" | "Intermediate" | "Expert";
export type PageStatus = "up-to-date" | "in-review" | "outdated";

export interface NavNode {
  title: string;
  path: string;
  contentType: ContentType;
  locked?: boolean;
  description?: string;
  children?: NavNode[];
}

/** Count badges shown next to sidebar nav rows, keyed by NavNode["path"].
 * Computed server-side (app/(app)/layout.tsx) from real content/mock data
 * and threaded down AppShell -> Sidebar -> SidebarNav -> NavItem. */
export type NavBadges = Record<string, { count: number; tone: "ok" | "warning" }>;

export interface PageMeta {
  owner: string;
  approvedBy: string;
  updatedDate: string;
  nextReviewDate: string;
  audience: Audience;
  level: Level;
  status: PageStatus;
}
