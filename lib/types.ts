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

export interface PageMeta {
  owner: string;
  approvedBy: string;
  updatedDate: string;
  nextReviewDate: string;
  audience: Audience;
  level: Level;
  status: PageStatus;
}
