export type ScriptTurnSpeaker = "operator" | "mijoz" | "note";

export interface ScriptTurnLink {
  label: string;
  type: "package" | "competitor" | "faq";
  /** Id into Package["id"], Competitor["id"] or Faq["id"] depending on type. */
  id: string;
}

export interface ScriptTurn {
  speaker: ScriptTurnSpeaker;
  text: string;
  subStepHeader?: string;
  /** Structured form of a conditional operator instruction that used to be
   * written as freeform text inside a "note" turn (e.g. "(agar ismini
   * yozmagan bo'lsa, murojaat qilish uchun ismingizni bilsam bo'ladimi?)").
   * Render as `(agar ${condition}, ${text})` to reproduce that exact copy. */
  condition?: string;
  /** Related package/competitor/FAQ entries to surface as inline chips
   * under this turn. Structural only for now — no script content sets this
   * yet; which turn should link to which package/competitor is a separate
   * content decision still to be made. */
  links?: ScriptTurnLink[];
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
  /** Optional Russian translations — raw, unresolved. Only populated on the
   * admin edit form's defaultValues (see components/admin/ScriptEditor.tsx);
   * lib/content/loader.ts getters resolve these into name/cheatSheet/stages
   * for locale "ru" and never return them alongside the resolved value. */
  nameRu?: string;
  cheatSheetRu?: string;
  stagesRu?: Stage[];
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
  /** Optional Russian translations — see Script.nameRu for the resolution
   * contract (raw here, resolved by lib/content/loader.ts getters). */
  labelRu?: string;
  clientSaysRu?: string;
  realMeaningRu?: string;
  responseRu?: string;
  followUpRu?: string;
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
  /** Optional Russian translations — see Script.nameRu for the resolution
   * contract. */
  questionRu?: string;
  answerRu?: string;
}

export interface Package {
  id: string;
  name: string;
  isFeatured: boolean;
  orderVolume: string;
  paymentTerms: string;
  estimatedDiscount: string;
  /** Numeric form of estimatedDiscount, e.g. 15 for "~15% gacha" — the field
   * the calculator does arithmetic on. estimatedDiscount stays for display. */
  discountPct: number;
  /** Numeric advance % parsed out of paymentTerms (e.g. 40 for "40% avans +
   * 60% nasiya"), or null when payment is 100% upfront/cash with no advance
   * split (paymentTerms stays for display either way). */
  advancePct: number | null;
  logistics: string;
  deliveryTime: string;
  /** Optional Russian translations — see Script.nameRu for the resolution
   * contract. discountPct/advancePct are numeric, not language-dependent. */
  nameRu?: string;
  orderVolumeRu?: string;
  paymentTermsRu?: string;
  estimatedDiscountRu?: string;
  logisticsRu?: string;
  deliveryTimeRu?: string;
}

export interface PackageGroup {
  id: string;
  title: string;
  subtitle: string;
  packages: Package[];
  /** Optional Russian translations — see Script.nameRu for the resolution
   * contract. */
  titleRu?: string;
  subtitleRu?: string;
}
