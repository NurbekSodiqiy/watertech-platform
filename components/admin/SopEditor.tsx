"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { useForm, useFieldArray, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/useToast";
import { useOnline } from "@/hooks/useOnline";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { GateReportDialog } from "@/components/admin/GateReportDialog";
import { VERSION_CONFLICT_MESSAGE } from "@/lib/admin/version-conflict";
import { sopWriteSchema, type SopFormValues } from "@/lib/admin/schemas";
import { upsertSop } from "@/lib/admin/actions/sops";
import type { Sop } from "@/lib/content/types";
import type { GateResult } from "@/lib/agents/publish-gate/types";

/** stepsRu mirrors steps field for field, so the step list below is
 * parameterized over which of the two arrays it is bound to — same trick as
 * ScriptEditor's StagesBase, instead of duplicating the list for the
 * "Ruscha (ixtiyoriy)" section. */
type StepsBase = "steps" | "stepsRu";

interface StepsFieldsProps {
  control: Control<SopFormValues>;
  register: UseFormRegister<SopFormValues>;
  errors: FieldErrors<SopFormValues>;
  base: StepsBase;
}

function StepsFields({ control, register, errors, base }: StepsFieldsProps) {
  const t = useTranslations("pages.admin.sops");
  const { fields, append, remove, swap } = useFieldArray({ control, name: base });
  const baseErrors = base === "steps" ? errors.steps : errors.stepsRu;
  const listError = baseErrors?.message ?? baseErrors?.root?.message;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-primary-dark">
          {base === "steps" ? t("steps.heading") : t("steps.headingRu")}
        </h2>
        <button
          type="button"
          onClick={() => append({ title: "", body: "" })}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-medium text-primary-dark hover:bg-surface-alt"
        >
          <Plus size={13} />
          {t("steps.add")}
        </button>
      </div>

      {listError && <p className="text-[11px] text-status-outdated">{listError}</p>}
      {fields.length === 0 && !listError && <p className="text-[12.5px] text-text-secondary">{t("steps.empty")}</p>}

      {fields.map((field, index) => {
        const titleError = baseErrors?.[index]?.title?.message;
        return (
          <div key={field.id} className="space-y-2.5 rounded-xl border border-border bg-surface-alt/60 p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[12px] font-semibold text-primary">
                {index + 1}
              </span>
              <span className="flex-1 text-[12.5px] font-medium text-primary-dark">{t("steps.title")}</span>
              <button
                type="button"
                onClick={() => swap(index, index - 1)}
                disabled={index === 0}
                aria-label={t("steps.moveUp")}
                className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-surface disabled:opacity-30"
              >
                <ChevronUp size={12} />
              </button>
              <button
                type="button"
                onClick={() => swap(index, index + 1)}
                disabled={index === fields.length - 1}
                aria-label={t("steps.moveDown")}
                className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-surface disabled:opacity-30"
              >
                <ChevronDown size={12} />
              </button>
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={t("steps.remove")}
                className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-status-outdated/10 hover:text-status-outdated"
              >
                <Trash2 size={12} />
              </button>
            </div>
            <div className="space-y-1">
              <input
                type="text"
                placeholder={t("steps.titlePlaceholder")}
                aria-label={t("steps.title")}
                {...register(`${base}.${index}.title`)}
                className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12.5px] text-primary-dark placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light"
              />
              {titleError && <p className="text-[11px] text-status-outdated">{titleError}</p>}
            </div>
            <textarea
              rows={2}
              placeholder={t("steps.body")}
              aria-label={t("steps.body")}
              {...register(`${base}.${index}.body`)}
              className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12.5px] text-primary-dark placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light"
            />
          </div>
        );
      })}
    </div>
  );
}

interface SopEditorProps {
  isNew: boolean;
  sop: Sop;
  status: "draft" | "published";
  version?: number;
}

/** Create/edit form for a SOP. A flat EntityForm can't express its repeatable
 * steps, so this is a small react-hook-form tree with one useFieldArray per
 * language — the pattern ScriptEditor uses for stages, minus the nesting and
 * the live preview. */
export function SopEditor({ isNew, sop, status, version }: SopEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("pages.admin.sops");
  const tToast = useTranslations("toast");
  const online = useOnline();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  // Set when saving with status "published" was blocked by the publish gate.
  const [gateResult, setGateResult] = useState<GateResult | null>(null);
  // Guards against a second submit firing before React re-renders the
  // button's `disabled` state — see the identical guard in EntityForm.tsx.
  const inFlightRef = useRef(false);

  const defaultValues: SopFormValues = {
    id: sop.id,
    title: sop.title,
    summary: sop.summary,
    status,
    version,
    steps: sop.steps,
    titleRu: sop.titleRu ?? "",
    summaryRu: sop.summaryRu ?? "",
    stepsRu: sop.stepsRu ?? [],
  };

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SopFormValues>({
    resolver: zodResolver(sopWriteSchema),
    defaultValues,
  });

  function submit(values: SopFormValues) {
    if (inFlightRef.current) return;
    if (!online) {
      toast({ kind: "error", title: tToast("offline") });
      return;
    }
    inFlightRef.current = true;
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        const result = await upsertSop(values);
        if (!result.ok) {
          const isConflict = result.error === VERSION_CONFLICT_MESSAGE;
          setError(result.error);
          if (result.gate) setGateResult(result.gate);
          toast({
            kind: "error",
            title: isConflict ? tToast("conflict") : result.error,
            action: isConflict ? { label: tToast("refresh"), onClick: () => router.refresh() } : undefined,
          });
          return;
        }
        setSuccess(true);
        toast({ kind: "success", title: tToast("saved") });
        router.push("/admin/sops");
        router.refresh();
      } finally {
        inFlightRef.current = false;
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="max-w-2xl space-y-6">
      {error && (
        <div className="rounded-xl border border-status-outdated/40 bg-status-outdated/10 px-4 py-2.5 text-[13px] text-primary-dark">
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-status-ok/40 bg-status-ok/10 px-4 py-2.5 text-[13px] text-status-ok">
          <CheckCircle2 size={15} />
          {tToast("saved")}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-surface p-4 shadow-soft sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium text-primary-dark" htmlFor="sop-id">
            {t("fields.id")}
          </label>
          <input
            id="sop-id"
            type="text"
            placeholder={t("fields.idPlaceholder")}
            readOnly={!isNew}
            {...register("id")}
            className={`w-full rounded-lg border border-border px-3 py-2 text-[13px] text-primary-dark placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light ${
              !isNew ? "bg-border/30 text-text-secondary" : "bg-surface-alt"
            }`}
          />
          {errors.id ? (
            <p className="text-[11px] text-status-outdated">{errors.id.message}</p>
          ) : (
            <p className="text-[11px] text-text-secondary">{t("fields.idHint")}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium text-primary-dark" htmlFor="sop-status">
            {t("fields.status")}
          </label>
          <select
            id="sop-status"
            {...register("status")}
            className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-[13px] text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light"
          >
            <option value="draft">{t("fields.statusDraft")}</option>
            <option value="published">{t("fields.statusPublished")}</option>
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="block text-[13px] font-medium text-primary-dark" htmlFor="sop-title">
            {t("fields.title")}
          </label>
          <input
            id="sop-title"
            type="text"
            {...register("title")}
            className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-[13px] text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light"
          />
          {errors.title && <p className="text-[11px] text-status-outdated">{errors.title.message}</p>}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="block text-[13px] font-medium text-primary-dark" htmlFor="sop-summary">
            {t("fields.summary")}
          </label>
          <textarea
            id="sop-summary"
            rows={2}
            {...register("summary")}
            className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-[13px] text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light"
          />
        </div>
      </div>

      <StepsFields control={control} register={register} errors={errors} base="steps" />

      <details className="rounded-xl border border-border bg-surface-alt/60 p-3.5">
        <summary className="cursor-pointer text-[13px] font-medium text-primary-dark">{t("form.ruSummary")}</summary>
        <div className="mt-3 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-primary-dark" htmlFor="sop-title-ru">
              {t("fields.title")}
            </label>
            <input
              id="sop-title-ru"
              type="text"
              {...register("titleRu")}
              className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-[13px] text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-primary-dark" htmlFor="sop-summary-ru">
              {t("fields.summary")}
            </label>
            <textarea
              id="sop-summary-ru"
              rows={2}
              {...register("summaryRu")}
              className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-[13px] text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light"
            />
          </div>
          <StepsFields control={control} register={register} errors={errors} base="stepsRu" />
        </div>
      </details>

      <div className="flex items-center gap-2 pt-2">
        <SubmitButton pending={pending} offlineBlocked={!online} pendingLabel={t("form.saving")}>
          {t("form.save")}
        </SubmitButton>
        <button
          type="button"
          onClick={() => router.push("/admin/sops")}
          className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-primary-dark transition-colors hover:bg-surface-alt"
        >
          {t("form.cancel")}
        </button>
      </div>

      <GateReportDialog result={gateResult} onClose={() => setGateResult(null)} />
    </form>
  );
}
