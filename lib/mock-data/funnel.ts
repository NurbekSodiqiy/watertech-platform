export interface FunnelStage {
  stage: string;
  entryCondition: string;
  exitCondition: string;
  actions: string;
  crmFields: string;
  linkedScript: string;
  linkedTemplate: string;
}

export const funnelStages: FunnelStage[] = [
  {
    stage: "1. New Lead",
    entryCondition: "[Placeholder — lead submitted or assigned.]",
    exitCondition: "[Placeholder — first contact attempted.]",
    actions: "[Placeholder — call within SLA window.]",
    crmFields: "Source, contact info",
    linkedScript: "First Call — Discovery",
    linkedTemplate: "—",
  },
  {
    stage: "2. Qualified",
    entryCondition: "[Placeholder — discovery call completed.]",
    exitCondition: "[Placeholder — need and budget confirmed.]",
    actions: "[Placeholder — log qualification notes.]",
    crmFields: "Segment, budget range, timeline",
    linkedScript: "First Call — Discovery",
    linkedTemplate: "—",
  },
  {
    stage: "3. Proposal Sent",
    entryCondition: "[Placeholder — qualified and pricing agreed internally.]",
    exitCondition: "[Placeholder — proposal delivered and opened.]",
    actions: "[Placeholder — send proposal, schedule follow-up.]",
    crmFields: "Proposal value, product lines",
    linkedScript: "—",
    linkedTemplate: "Proposal Template",
  },
  {
    stage: "4. Negotiation",
    entryCondition: "[Placeholder — proposal reviewed by prospect.]",
    exitCondition: "[Placeholder — terms agreed.]",
    actions: "[Placeholder — handle objections, adjust terms.]",
    crmFields: "Discount %, objections logged",
    linkedScript: "—",
    linkedTemplate: "—",
  },
  {
    stage: "5. Closed Won / Lost",
    entryCondition: "[Placeholder — final decision made.]",
    exitCondition: "[Placeholder — contract signed or lead archived.]",
    actions: "[Placeholder — log outcome and reason.]",
    crmFields: "Outcome, loss reason (if lost)",
    linkedScript: "—",
    linkedTemplate: "Contract Terms",
  },
];
