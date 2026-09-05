export interface Module {
  id: string;
  topic: string;
  format: string;
  duration: string;
  test: string;
  level: "Basic" | "Intermediate" | "Expert";
}

export const modules: Module[] = [
  { id: "mod-1", topic: "[Placeholder — Product Fundamentals]", format: "Video", duration: "18 min", test: "Yes", level: "Basic" },
  { id: "mod-2", topic: "[Placeholder — Discovery Questions]", format: "Interactive", duration: "25 min", test: "Yes", level: "Basic" },
  { id: "mod-3", topic: "[Placeholder — Objection Handling]", format: "Roleplay", duration: "40 min", test: "Yes", level: "Intermediate" },
  { id: "mod-4", topic: "[Placeholder — Technical Specifications]", format: "Reading", duration: "30 min", test: "No", level: "Intermediate" },
  { id: "mod-5", topic: "[Placeholder — Negotiation Tactics]", format: "Video", duration: "22 min", test: "Yes", level: "Expert" },
  { id: "mod-6", topic: "[Placeholder — Tender Process]", format: "Reading", duration: "35 min", test: "Yes", level: "Expert" },
];
