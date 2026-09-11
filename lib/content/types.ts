export type ScriptTurnSpeaker = "operator" | "mijoz" | "note";

export interface ScriptTurn {
  speaker: ScriptTurnSpeaker;
  text: string;
  subStepHeader?: string;
  /** Structured form of a conditional operator instruction that used to be
   * written as freeform text inside a "note" turn (e.g. "(agar ismini
   * yozmagan bo'lsa, murojaat qilish uchun ismingizni bilsam bo'ladimi?)").
   * Render as `(agar ${condition}, ${text})` to reproduce that exact copy. */
  condition?: string;
}

export interface Stage {
  id: string;
  label: string;
  turns: ScriptTurn[];
  /** Objection ids (Objection["id"]) handled at this stage — looked up
   * against the shared Objection[] list. Only non-empty for a script's
   * "E'tiroz ustida ishlash" stage; turns is [] for those since the
   * content comes entirely from the referenced objections. */
  objectionIds: string[];
  /** Id of the stage that conventionally follows this one, if any. */
  nextStageId?: string;
}

export interface Script {
  id: string;
  name: string;
  /** Short summary shown at the top of the detailed /scripts/[slug] view. */
  cheatSheet: string;
  stages: Stage[];
}

export interface Objection {
  id: string;
  /** Short label used as the accordion/tab title (e.g. "Narxi qimmat"). */
  label: string;
  keywords: string[];
  /** The client's line, verbatim, as dialogue. */
  clientSays: string;
  /** What the objection actually signals beneath the surface. */
  realMeaning: string;
  /** The operator's canonical reply — identical wherever this objection is
   * referenced, regardless of which script it's shown from. */
  response: string;
  followUp?: string;
  /** Script ids (Script["id"]) this objection is used in. */
  scriptIds: string[];
}

export interface Competitor {
  id: string;
  name: string;
  assortment: string;
  baseDiscount: string;
  volumeDiscount: string;
  retroBonus: string;
  maxDiscount: string;
  paymentTerms: string;
  paymentMethod: string;
  deliveryTime: string;
  logistics: string;
  dealerCoverage: string;
  certificates: string;
  marketingOffers: string;
  threatLevel: "Yuqori" | "O'rta" | "Ma'lumot yo'q";
}

export interface Faq {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export interface Package {
  id: string;
  name: string;
  isFeatured: boolean;
  orderVolume: string;
  paymentTerms: string;
  estimatedDiscount: string;
  logistics: string;
  deliveryTime: string;
}

export interface PackageGroup {
  id: string;
  title: string;
  subtitle: string;
  packages: Package[];
}
