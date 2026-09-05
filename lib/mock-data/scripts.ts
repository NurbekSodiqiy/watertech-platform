export interface SalesScript {
  slug: string;
  title: string;
  goal: string;
  successCriteria: string;
  opening: string;
  situationQuestions: string[];
  problemQuestions: string[];
  implicationQuestions: string[];
  needPayoffQuestions: string[];
  presentationBlock: string;
  nextStepCommitment: string;
  dontDo: string[];
}

export const scripts: SalesScript[] = [
  {
    slug: "first-call-discovery",
    title: "[First Call — Discovery]",
    goal: "[Placeholder — e.g. qualify the lead and book a technical follow-up.]",
    successCriteria: "[Placeholder — e.g. prospect agrees to a next meeting with a date set.]",
    opening: "[Placeholder opening line establishing reason for the call.]",
    situationQuestions: [
      "[Situation question 1 — placeholder]",
      "[Situation question 2 — placeholder]",
      "[Situation question 3 — placeholder]",
    ],
    problemQuestions: [
      "[Problem question 1 — placeholder]",
      "[Problem question 2 — placeholder]",
      "[Problem question 3 — placeholder]",
    ],
    implicationQuestions: [
      "[Implication question 1 — placeholder]",
      "[Implication question 2 — placeholder]",
    ],
    needPayoffQuestions: [
      "[Need-payoff question 1 — placeholder]",
      "[Need-payoff question 2 — placeholder]",
    ],
    presentationBlock: "[Placeholder — how to present the fitting solution once needs are confirmed.]",
    nextStepCommitment: "[Placeholder — specific next step to ask for.]",
    dontDo: [
      "[Don't — placeholder 1]",
      "[Don't — placeholder 2]",
      "[Don't — placeholder 3]",
      "[Don't — placeholder 4]",
      "[Don't — placeholder 5]",
    ],
  },
  {
    slug: "renewal-upsell",
    title: "[Renewal / Upsell Call]",
    goal: "[Placeholder — e.g. expand an existing account into a new product line.]",
    successCriteria: "[Placeholder — e.g. sample order requested.]",
    opening: "[Placeholder opening line referencing the existing relationship.]",
    situationQuestions: [
      "[Situation question 1 — placeholder]",
      "[Situation question 2 — placeholder]",
      "[Situation question 3 — placeholder]",
    ],
    problemQuestions: [
      "[Problem question 1 — placeholder]",
      "[Problem question 2 — placeholder]",
      "[Problem question 3 — placeholder]",
    ],
    implicationQuestions: [
      "[Implication question 1 — placeholder]",
      "[Implication question 2 — placeholder]",
    ],
    needPayoffQuestions: [
      "[Need-payoff question 1 — placeholder]",
      "[Need-payoff question 2 — placeholder]",
    ],
    presentationBlock: "[Placeholder — how to introduce the adjacent product line.]",
    nextStepCommitment: "[Placeholder — specific next step to ask for.]",
    dontDo: [
      "[Don't — placeholder 1]",
      "[Don't — placeholder 2]",
      "[Don't — placeholder 3]",
      "[Don't — placeholder 4]",
      "[Don't — placeholder 5]",
    ],
  },
];
