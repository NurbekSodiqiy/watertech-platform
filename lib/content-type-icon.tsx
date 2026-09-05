import { FileText, Database, Video, ListChecks, FlaskConical, Lock, LucideIcon } from "lucide-react";
import type { ContentType } from "./types";

export const contentTypeIcons: Record<ContentType, LucideIcon> = {
  doc: FileText,
  database: Database,
  video: Video,
  checklist: ListChecks,
  quiz: FlaskConical,
};

export { Lock as LockIcon };
