export interface SopStep {
  step: number;
  action: string;
  note: string;
}

export interface AmoSop {
  slug: string;
  title: string;
  steps: SopStep[];
}

export const amoSops: AmoSop[] = [
  {
    slug: "lead-creation",
    title: "Lead Creation",
    steps: [
      { step: 1, action: "[Placeholder step — where the lead should be created.]", note: "[Note placeholder]" },
      { step: 2, action: "[Placeholder step — required fields to fill in.]", note: "[Note placeholder]" },
      { step: 3, action: "[Placeholder step — tagging convention.]", note: "[Note placeholder]" },
    ],
  },
  {
    slug: "stage-transition",
    title: "Stage Transition",
    steps: [
      { step: 1, action: "[Placeholder step — condition to move a lead forward.]", note: "[Note placeholder]" },
      { step: 2, action: "[Placeholder step — who can move a lead backward.]", note: "[Note placeholder]" },
    ],
  },
  {
    slug: "task-setting",
    title: "Task Setting",
    steps: [
      { step: 1, action: "[Placeholder step — when a follow-up task is required.]", note: "[Note placeholder]" },
      { step: 2, action: "[Placeholder step — default task due windows.]", note: "[Note placeholder]" },
    ],
  },
  {
    slug: "card-standard",
    title: "Card Standard",
    steps: [
      { step: 1, action: "[Placeholder step — naming convention for cards.]", note: "[Note placeholder]" },
      { step: 2, action: "[Placeholder step — mandatory attachments.]", note: "[Note placeholder]" },
    ],
  },
  {
    slug: "loss-reasons",
    title: "Loss Reasons",
    steps: [
      { step: 1, action: "[Placeholder step — selecting the correct loss reason.]", note: "[Note placeholder]" },
      { step: 2, action: "[Placeholder step — required comment on loss.]", note: "[Note placeholder]" },
    ],
  },
  {
    slug: "reports",
    title: "Reports",
    steps: [
      { step: 1, action: "[Placeholder step — which report to run weekly.]", note: "[Note placeholder]" },
      { step: 2, action: "[Placeholder step — who reviews the report.]", note: "[Note placeholder]" },
    ],
  },
];
