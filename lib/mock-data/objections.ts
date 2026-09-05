export interface Objection {
  id: string;
  objection: string;
  realMeaning: string;
  answer1: string;
  answer2: string;
  badAnswer: string;
  linkedCase: string;
}

export const objections: Objection[] = [
  {
    id: "obj-1",
    objection: "[\"Your price is too high.\"]",
    realMeaning: "[They haven't seen the value difference yet, or are anchoring to a cheaper competitor.]",
    answer1: "[Placeholder answer reframing total cost of ownership.]",
    answer2: "[Placeholder answer offering a comparison against a lower tier.]",
    badAnswer: "[Placeholder example of an answer that concedes too fast on price.]",
    linkedCase: "[Case Study — Placeholder]",
  },
  {
    id: "obj-2",
    objection: "[\"We already work with another supplier.\"]",
    realMeaning: "[Switching cost / risk aversion, not necessarily loyalty.]",
    answer1: "[Placeholder answer proposing a small pilot order.]",
    answer2: "[Placeholder answer highlighting a specific service gap.]",
    badAnswer: "[Placeholder example of directly bad-mouthing the competitor.]",
    linkedCase: "[Case Study — Placeholder]",
  },
  {
    id: "obj-3",
    objection: "[\"I need to check with my team first.\"]",
    realMeaning: "[Either a genuine multi-stakeholder process or a soft decline.]",
    answer1: "[Placeholder answer offering a joint call with the team.]",
    answer2: "[Placeholder answer providing a one-pager to forward internally.]",
    badAnswer: "[Placeholder example of pushing for an immediate decision.]",
    linkedCase: "[Case Study — Placeholder]",
  },
  {
    id: "obj-4",
    objection: "[\"Delivery time is too long.\"]",
    realMeaning: "[Project timeline pressure or a prior bad experience with delays.]",
    answer1: "[Placeholder answer describing expedited options.]",
    answer2: "[Placeholder answer on partial/staged shipment.]",
    badAnswer: "[Placeholder example of an overpromise on timing.]",
    linkedCase: "[Case Study — Placeholder]",
  },
];
