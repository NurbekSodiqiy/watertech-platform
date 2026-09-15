"use client";

import { forwardRef, useEffect, useMemo, useRef, useState, useTransition, type TextareaHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import {
  useForm,
  useFieldArray,
  useWatch,
  useController,
  type Control,
  type UseFormRegister,
  type FieldErrors,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { scriptWriteSchema, type ScriptFormValues } from "@/lib/admin/schemas";
import { upsertScript } from "@/lib/admin/actions/scripts";
import { ScriptTurnList } from "@/components/ScriptTurnList";
import { ScriptsContentProvider } from "@/components/scripts/ScriptsContentContext";
import { ClientNameProvider } from "@/components/ClientNameContext";
import type { Competitor, Faq, Objection, PackageGroup, Script, ScriptTurnLink } from "@/lib/content/types";
import type { ContentBundle } from "@/lib/content/loader";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SPEAKER_OPTIONS: { value: "operator" | "mijoz" | "note"; label: string }[] = [
  { value: "operator", label: "Operator" },
  { value: "mijoz", label: "Mijoz" },
  { value: "note", label: "Izoh" },
];

const LINK_TYPE_OPTIONS: { value: ScriptTurnLink["type"]; label: string }[] = [
  { value: "package", label: "Paket" },
  { value: "competitor", label: "Raqobatchi" },
  { value: "faq", label: "FAQ" },
];

/** Turns "" back into undefined for the optional string/array fields the
 * form always keeps defined (controlled inputs need a defined default) —
 * so saved content matches the shape hand-written scripts already use. */
function cleanStages(stages: ScriptFormValues["stages"]): ScriptFormValues["stages"] {
  return stages.map((stage) => ({
    ...stage,
    turns: stage.turns.map((turn) => ({
      ...turn,
      subStepHeader: turn.subStepHeader || undefined,
      condition: turn.condition || undefined,
      links: turn.links && turn.links.length > 0 ? turn.links : undefined,
    })),
  }));
}

const AutosizeTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function AutosizeTextarea({ className, onInput, ...props }, forwardedRef) {
    const localRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
      const el = localRef.current;
      if (el) {
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
      }
    }, []);

    return (
      <textarea
        ref={(node) => {
          localRef.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        rows={2}
        onInput={(e) => {
          const el = e.currentTarget;
          el.style.height = "auto";
          el.style.height = `${el.scrollHeight}px`;
          onInput?.(e);
        }}
        className={`w-full resize-none overflow-hidden rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12.5px] text-primary-dark placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light ${className ?? ""}`}
        {...props}
      />
    );
  }
);

interface LinkRowProps {
  control: Control<ScriptFormValues>;
  path: `stages.${number}.turns.${number}.links.${number}`;
  competitors: Competitor[];
  faqs: Faq[];
  packageGroups: PackageGroup[];
  onRemove: () => void;
}

function LinkRow({ control, path, competitors, faqs, packageGroups, onRemove }: LinkRowProps) {
  const { field: typeField } = useController({ control, name: `${path}.type` });
  const { field: idField } = useController({ control, name: `${path}.id` });
  const { field: labelField } = useController({ control, name: `${path}.label` });
  const packages = useMemo(() => packageGroups.flatMap((g) => g.packages), [packageGroups]);

  const idOptions =
    typeField.value === "competitor"
      ? competitors.map((c) => ({ value: c.id, label: c.name }))
      : typeField.value === "faq"
        ? faqs.map((f) => ({ value: f.id, label: f.question }))
        : packages.map((p) => ({ value: p.id, label: p.name }));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <select
        name={typeField.name}
        value={typeField.value}
        onChange={(e) => {
          typeField.onChange(e.target.value);
          idField.onChange("");
        }}
        onBlur={typeField.onBlur}
        ref={typeField.ref}
        className="rounded-md border border-border bg-surface px-2 py-1 text-[11.5px] text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light"
      >
        {LINK_TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <select
        name={idField.name}
        value={idField.value}
        onChange={idField.onChange}
        onBlur={idField.onBlur}
        ref={idField.ref}
        className="min-w-[120px] flex-1 rounded-md border border-border bg-surface px-2 py-1 text-[11.5px] text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light"
      >
        <option value="">—</option>
        {idOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Yorliq"
        name={labelField.name}
        value={labelField.value}
        onChange={labelField.onChange}
        onBlur={labelField.onBlur}
        ref={labelField.ref}
        className="min-w-[100px] flex-1 rounded-md border border-border bg-surface px-2 py-1 text-[11.5px] text-primary-dark placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Havolani o'chirish"
        className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-status-outdated/10 hover:text-status-outdated"
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}

interface TurnFieldsProps {
  control: Control<ScriptFormValues>;
  register: UseFormRegister<ScriptFormValues>;
  stageIndex: number;
  turnIndex: number;
  isFirst: boolean;
  isLast: boolean;
  competitors: Competitor[];
  faqs: Faq[];
  packageGroups: PackageGroup[];
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

function TurnFields({
  control,
  register,
  stageIndex,
  turnIndex,
  isFirst,
  isLast,
  competitors,
  faqs,
  packageGroups,
  onMoveUp,
  onMoveDown,
  onRemove,
}: TurnFieldsProps) {
  const base = `stages.${stageIndex}.turns.${turnIndex}` as const;
  const {
    fields: linkFields,
    append: appendLink,
    remove: removeLink,
  } = useFieldArray({ control, name: `${base}.links` });

  return (
    <div className="space-y-2.5 rounded-xl border border-border bg-surface-alt/60 p-3">
      <div className="flex items-center gap-2">
        <select
          {...register(`${base}.speaker`)}
          className="rounded-lg border border-border bg-surface px-2 py-1.5 text-[12.5px] text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light"
        >
          {SPEAKER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="flex-1" />
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst}
          aria-label="Yuqoriga"
          className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-surface disabled:opacity-30"
        >
          <ChevronUp size={12} />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          aria-label="Pastga"
          className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-surface disabled:opacity-30"
        >
          <ChevronDown size={12} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Replikani o'chirish"
          className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-status-outdated/10 hover:text-status-outdated"
        >
          <Trash2 size={12} />
        </button>
      </div>

      <AutosizeTextarea {...register(`${base}.text`)} placeholder="Matn" />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          type="text"
          placeholder="Sarlavha (ixtiyoriy)"
          {...register(`${base}.subStepHeader`)}
          className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12.5px] text-primary-dark placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light"
        />
        <input
          type="text"
          placeholder="Shart (ixtiyoriy)"
          {...register(`${base}.condition`)}
          className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12.5px] text-primary-dark placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium text-text-secondary">Havolalar</p>
          <button
            type="button"
            onClick={() => appendLink({ type: "package", id: "", label: "" })}
            className="flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-primary-dark hover:bg-surface"
          >
            <Plus size={11} />
            Havola
          </button>
        </div>
        {linkFields.map((linkField, linkIndex) => (
          <LinkRow
            key={linkField.id}
            control={control}
            path={`${base}.links.${linkIndex}`}
            competitors={competitors}
            faqs={faqs}
            packageGroups={packageGroups}
            onRemove={() => removeLink(linkIndex)}
          />
        ))}
      </div>
    </div>
  );
}

interface StageFieldsProps {
  control: Control<ScriptFormValues>;
  register: UseFormRegister<ScriptFormValues>;
  stageIndex: number;
  isFirst: boolean;
  isLast: boolean;
  nextStageLabel?: string;
  objections: Objection[];
  competitors: Competitor[];
  faqs: Faq[];
  packageGroups: PackageGroup[];
  selected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  errors: FieldErrors<ScriptFormValues>;
}

function StageFields({
  control,
  register,
  stageIndex,
  isFirst,
  isLast,
  nextStageLabel,
  objections,
  competitors,
  faqs,
  packageGroups,
  selected,
  onSelect,
  onMoveUp,
  onMoveDown,
  onRemove,
  errors,
}: StageFieldsProps) {
  const {
    fields: turnFields,
    append: appendTurn,
    remove: removeTurn,
    swap: swapTurn,
  } = useFieldArray({ control, name: `stages.${stageIndex}.turns` });

  const { field: labelField } = useController({ control, name: `stages.${stageIndex}.label` });
  const { field: idField } = useController({ control, name: `stages.${stageIndex}.id` });
  const { field: objectionIdsField } = useController({ control, name: `stages.${stageIndex}.objectionIds` });

  const stageIdError = errors.stages?.[stageIndex]?.id?.message;

  function toggleObjection(id: string) {
    const current = objectionIdsField.value ?? [];
    objectionIdsField.onChange(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }

  return (
    <div
      className={`space-y-4 rounded-2xl border p-4 shadow-soft transition-colors ${
        selected ? "border-primary bg-primary/5" : "border-border bg-surface"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onSelect} className="flex-1 text-left text-[14px] font-semibold text-primary-dark">
          {stageIndex + 1}. Bosqich {labelField.value ? `— ${labelField.value}` : ""}
        </button>
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst}
          aria-label="Yuqoriga"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-alt disabled:opacity-30"
        >
          <ChevronUp size={13} />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          aria-label="Pastga"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-alt disabled:opacity-30"
        >
          <ChevronDown size={13} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Bosqichni o'chirish"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-status-outdated/10 hover:text-status-outdated"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-[12.5px] font-medium text-primary-dark">Yorliq</label>
          <input
            type="text"
            name={labelField.name}
            value={labelField.value}
            onBlur={labelField.onBlur}
            ref={labelField.ref}
            onChange={(e) => {
              labelField.onChange(e);
              if (!idField.value) idField.onChange(slugify(e.target.value));
            }}
            className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-[13px] text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-[12.5px] font-medium text-primary-dark">ID (slug)</label>
          <input
            type="text"
            name={idField.name}
            value={idField.value}
            onChange={idField.onChange}
            onBlur={idField.onBlur}
            ref={idField.ref}
            className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-[13px] text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light"
          />
          {stageIdError && <p className="text-[11px] text-status-outdated">{String(stageIdError)}</p>}
        </div>
      </div>

      <p className="text-[11px] text-text-secondary">
        Keyingi bosqich: <span className="font-medium text-primary-dark">{nextStageLabel || "(oxirgi bosqich)"}</span>
      </p>

      <div className="space-y-1.5">
        <p className="text-[12.5px] font-medium text-primary-dark">E&apos;tirozlar (ushbu bosqichda ko&apos;rsatiladi)</p>
        <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-surface-alt p-2">
          {objections.map((o) => (
            <label key={o.id} className="flex items-center gap-2 px-1.5 py-1 text-[12.5px] text-primary-dark">
              <input
                type="checkbox"
                checked={objectionIdsField.value?.includes(o.id) ?? false}
                onChange={() => toggleObjection(o.id)}
                className="h-3.5 w-3.5 rounded border-border text-accent focus:outline-none focus:ring-2 focus:ring-primary-light"
              />
              {o.label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[12.5px] font-medium text-primary-dark">Repliklar</p>
          <button
            type="button"
            onClick={() => appendTurn({ speaker: "operator", text: "", subStepHeader: "", condition: "", links: [] })}
            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[12px] font-medium text-primary-dark hover:bg-surface-alt"
          >
            <Plus size={12} />
            Replika
          </button>
        </div>

        {turnFields.map((turnField, turnIndex) => (
          <TurnFields
            key={turnField.id}
            control={control}
            register={register}
            stageIndex={stageIndex}
            turnIndex={turnIndex}
            isFirst={turnIndex === 0}
            isLast={turnIndex === turnFields.length - 1}
            competitors={competitors}
            faqs={faqs}
            packageGroups={packageGroups}
            onMoveUp={() => swapTurn(turnIndex, turnIndex - 1)}
            onMoveDown={() => swapTurn(turnIndex, turnIndex + 1)}
            onRemove={() => removeTurn(turnIndex)}
          />
        ))}
      </div>
    </div>
  );
}

interface ScriptEditorProps {
  isNew: boolean;
  script: Script;
  status: "draft" | "published";
  objections: Objection[];
  competitors: Competitor[];
  faqs: Faq[];
  packageGroups: PackageGroup[];
  previewBundle: ContentBundle;
}

/** Structured create/edit form for a script's nested stages[] -> turns[] —
 * a flat EntityForm (components/admin/EntityForm.tsx) can't express this
 * shape, so this is a bespoke react-hook-form tree with useFieldArray
 * nested twice (stages, then each stage's turns and each turn's links). See
 * CLAUDE.md S15-part-2 task notes: nextStageId is never edited here — the
 * server recomputes it from save-time array order via db.ts's chain(),
 * exactly like the hand-written seed scripts do, so the "next stage" line
 * below is a read-only preview of what the server will write, not a field. */
export function ScriptEditor({
  isNew,
  script,
  status,
  objections,
  competitors,
  faqs,
  packageGroups,
  previewBundle,
}: ScriptEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedStage, setSelectedStage] = useState(0);

  const defaultValues: ScriptFormValues = {
    id: script.id,
    name: script.name,
    cheatSheet: script.cheatSheet,
    status,
    stages: script.stages.map((s) => ({
      id: s.id,
      label: s.label,
      objectionIds: s.objectionIds,
      nextStageId: s.nextStageId,
      turns: s.turns.map((t) => ({
        speaker: t.speaker,
        text: t.text,
        subStepHeader: t.subStepHeader ?? "",
        condition: t.condition ?? "",
        links: t.links ?? [],
      })),
    })),
  };

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ScriptFormValues>({
    resolver: zodResolver(scriptWriteSchema),
    defaultValues,
  });

  const {
    fields: stageFields,
    append: appendStage,
    remove: removeStage,
    swap: swapStage,
  } = useFieldArray({ control, name: "stages" });

  const watchedStages = useWatch({ control, name: "stages" });

  useEffect(() => {
    if (selectedStage >= stageFields.length) setSelectedStage(Math.max(0, stageFields.length - 1));
  }, [stageFields.length, selectedStage]);

  const previewTurns = watchedStages?.[selectedStage]?.turns ?? [];

  function submit(values: ScriptFormValues) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await upsertScript({ ...values, stages: cleanStages(values.stages) });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      router.push("/admin/scripts");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        {error && (
          <div className="rounded-xl border border-status-outdated/40 bg-status-outdated/10 px-4 py-2.5 text-[13px] text-primary-dark">
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-xl border border-status-ok/40 bg-status-ok/10 px-4 py-2.5 text-[13px] text-status-ok">
            <CheckCircle2 size={15} />
            Saqlandi
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-surface p-4 shadow-soft sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-primary-dark" htmlFor="script-id">
              ID (slug)
            </label>
            <input
              id="script-id"
              type="text"
              placeholder="masalan: lead-orqali-tushgan"
              readOnly={!isNew}
              {...register("id")}
              className={`w-full rounded-lg border border-border px-3 py-2 text-[13px] text-primary-dark placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light ${
                !isNew ? "bg-border/30 text-text-secondary" : "bg-surface-alt"
              }`}
            />
            {errors.id && <p className="text-[11px] text-status-outdated">{errors.id.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-primary-dark" htmlFor="script-status">
              Holat
            </label>
            <select
              id="script-status"
              {...register("status")}
              className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-[13px] text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light"
            >
              <option value="draft">Qoralama</option>
              <option value="published">Nashr etilgan</option>
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-[13px] font-medium text-primary-dark" htmlFor="script-name">
              Nomi
            </label>
            <input
              id="script-name"
              type="text"
              {...register("name")}
              className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-[13px] text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light"
            />
            {errors.name && <p className="text-[11px] text-status-outdated">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-[13px] font-medium text-primary-dark" htmlFor="script-cheat-sheet">
              Shpargalka
            </label>
            <textarea
              id="script-cheat-sheet"
              rows={3}
              {...register("cheatSheet")}
              className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-[13px] text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-primary-dark">Bosqichlar</h2>
            <button
              type="button"
              onClick={() => appendStage({ id: "", label: "", objectionIds: [], turns: [] })}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-medium text-primary-dark hover:bg-surface-alt"
            >
              <Plus size={13} />
              Bosqich qo&apos;shish
            </button>
          </div>

          {stageFields.map((stageField, stageIndex) => (
            <StageFields
              key={stageField.id}
              control={control}
              register={register}
              stageIndex={stageIndex}
              isFirst={stageIndex === 0}
              isLast={stageIndex === stageFields.length - 1}
              nextStageLabel={watchedStages?.[stageIndex + 1]?.label}
              objections={objections}
              competitors={competitors}
              faqs={faqs}
              packageGroups={packageGroups}
              selected={selectedStage === stageIndex}
              onSelect={() => setSelectedStage(stageIndex)}
              onMoveUp={() => swapStage(stageIndex, stageIndex - 1)}
              onMoveDown={() => swapStage(stageIndex, stageIndex + 1)}
              onRemove={() => removeStage(stageIndex)}
              errors={errors}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-surface transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? "Saqlanmoqda…" : "Saqlash"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/scripts")}
            className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-primary-dark transition-colors hover:bg-surface-alt"
          >
            Bekor qilish
          </button>
        </div>
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
            Ko&apos;rinish {stageFields.length > 0 ? `(bosqich ${selectedStage + 1})` : ""}
          </h2>
          <ClientNameProvider>
            <ScriptsContentProvider value={previewBundle}>
              <ScriptTurnList turns={previewTurns} large={false} />
            </ScriptsContentProvider>
          </ClientNameProvider>
        </div>
      </div>
    </form>
  );
}
