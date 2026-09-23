"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useRouter, Link } from "@/i18n/routing";
import {
  useForm,
  useWatch,
  type DefaultValues,
  type FieldValues,
  type Path,
  type PathValue,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodType, ZodTypeDef } from "zod";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/useToast";
import { useOnline } from "@/hooks/useOnline";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { GateReportDialog } from "@/components/admin/GateReportDialog";
import { useActionError } from "@/hooks/useActionError";
import { adminErrorMap, validationText } from "@/lib/admin/validation";
import { toSlug } from "@/lib/admin/slug";
import { checkContentIdAvailable } from "@/lib/admin/actions/slug";
import type { ActionResult } from "@/lib/admin/errors";
import type { ImageUploadResult } from "@/lib/admin/product-image";
import type { GateResult } from "@/lib/agents/publish-gate/types";
import type { DashboardTableName } from "@/lib/dashboard/content-health";

// Only the product editor has an image field, so the picker is a chunk of its
// own rather than part of every admin form. Server-rendered (the current
// photo is worth showing at once); the placeholder is the field's height.
const ImageUploadField = dynamic(
  () => import("@/components/admin/ImageUploadField").then((m) => m.ImageUploadField),
  { loading: () => <div className="h-[252px] rounded-xl bg-surface-alt" aria-hidden="true" /> }
);

/** Every entity form binds the row version to a hidden input of this name. */
const VERSION_FIELD = "version";
/** Every content write schema's id field (lib/admin/schemas.ts's `ContentWrite`) —
 * what id-autofill (`titleField`) and the availability hint (`table`) below bind to. */
const ID_FIELD = "id";
/** How long a manager pauses typing before the id-availability hint fires. */
const ID_CHECK_DEBOUNCE_MS = 400;

export type EntityFieldDef<TIn extends FieldValues> = (
  | { kind: "text"; name: Path<TIn>; label: string; placeholder?: string; readOnly?: boolean; hint?: string }
  | { kind: "textarea"; name: Path<TIn>; label: string; rows?: number }
  | { kind: "number"; name: Path<TIn>; label: string; step?: string }
  | { kind: "checkbox"; name: Path<TIn>; label: string }
  | { kind: "select"; name: Path<TIn>; label: string; options: { value: string; label: string }[] }
  | { kind: "csv"; name: Path<TIn>; label: string; placeholder?: string; hint: string }
  | { kind: "hidden"; name: Path<TIn> }
  | {
      /** A photo uploaded on its own, not a form value: the upload Server
       * Action writes the column itself and answers with the row's new
       * version, which the form saves with from then on — so the next save
       * does not conflict with the manager's own upload. `name` is only the
       * field's key. */
      kind: "image";
      name: string;
      label: string;
      /** Absent while creating: there is no row to attach a photo to yet. */
      rowId?: string;
      currentSrc: string | null;
      currentAlt: string;
      upload: (form: FormData) => Promise<ImageUploadResult>;
    }
) & {
  /** Renders under a collapsed "Ruscha (ixtiyoriy)" <details> instead of
   * inline with the main fields — every *_ru translation field sets this
   * instead of getting its own EntityForm variant. */
  group?: "ru";
};

/** Config-driven create/edit form shared by every admin section —
 * react-hook-form + zodResolver on the same schema the server action
 * re-validates with (see lib/admin/schemas.ts), so client and server agree
 * on field shape. `TIn` is the schema's raw input type (what the HTML
 * inputs bind to — comma-joined strings for array fields, etc.); `TOut` is
 * what zodResolver produces after parsing, which is what `onSubmit`
 * receives and matches the *Write schema the server action expects. */
/** A next-intl translator narrowed to plain lookups — the entity pages hand it to
 * their `buildFields` helpers. */
export type AdminTranslate = (key: string) => string;

export function EntityForm<TIn extends FieldValues, TOut extends FieldValues>({
  schema,
  defaultValues,
  fields,
  onSubmit,
  backHref,
  editAfterCreate = false,
  titleField,
  table,
  renderPreview,
}: {
  schema: ZodType<TOut, ZodTypeDef, TIn>;
  defaultValues: DefaultValues<TIn>;
  fields: EntityFieldDef<TIn>[];
  onSubmit: (values: TOut) => Promise<ActionResult>;
  backHref: string;
  /** After a create, open the new row's editor (`${backHref}/${id}`) instead
   * of the list — for forms with parts that need a saved row, like a photo. */
  editAfterCreate?: boolean;
  /** Which field drives the id field's autofill on a new row — the id field
   * fills in with `toSlug(watch(titleField))` (lib/admin/slug.ts) until the
   * manager edits it by hand. Ignored once the id field is `readOnly`
   * (editing an existing row). */
  titleField?: Path<TIn>;
  /** Enables the id-autofill's debounced availability hint — which table to
   * check the candidate id against (lib/admin/actions/slug.ts). */
  table?: DashboardTableName;
  /** A read-only "as the operator sees it" drawer, behind a preview toggle
   * next to Save — only the modules DraftPreview supports (objections, FAQ)
   * pass this; every other EntityForm-based module renders unchanged. Called
   * with the form's live (unvalidated) values and the drawer's open state. */
  renderPreview?: (values: TIn, open: boolean, onClose: () => void) => ReactNode;
}) {
  const router = useRouter();
  const tConfirm = useTranslations("admin.confirm");
  const { toast } = useToast();
  const describeError = useActionError();
  const t = useTranslations("toast");
  const tForm = useTranslations("admin.form");
  const tValidation = useTranslations("admin.validation");
  const online = useOnline();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  // Set when saving with status "published" was blocked by the publish gate.
  const [gateResult, setGateResult] = useState<GateResult | null>(null);
  // Guards against a second submit firing before React re-renders the
  // button's `disabled` state (a fast double-click/double-Enter) — a ref
  // since it must be read/written synchronously, not through a re-render.
  const inFlightRef = useRef(false);
  // A photo upload in flight bumps the row version when it lands; saving in
  // the meantime would send the old one and conflict with it.
  const [imageBusy, setImageBusy] = useState(false);
  // The version an image upload answered with. submit() lays it over the
  // hidden input's value, which still holds the version the page loaded.
  const [uploadedVersion, setUploadedVersion] = useState<number | null>(null);
  // Opens the RU <details> when a dashboard "Tarjima qilish" quick action
  // links here with a #ru hash (lib/dashboard/content-health.ts's
  // adminEditHref) — a plain effect, not the details element's own `open`
  // prop, since that would fight the user re-collapsing it on every render.
  const ruDetailsRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (window.location.hash === "#ru" && ruDetailsRef.current) {
      ruDetailsRef.current.open = true;
      ruDetailsRef.current.scrollIntoView({ block: "start" });
    }
  }, []);

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    control,
    formState: { errors, isDirty },
  } = useForm<TIn>({
    // raw: true — zodResolver still runs `schema` for validation (so field
    // errors surface below), but hands handleSubmit the untransformed input
    // instead of the parsed TOut. The installed @hookform/resolvers version
    // predates RHF's separate-output-type generic, so there's no type-safe
    // way for it to hand back TOut directly; schema.parse below redoes the
    // (already-validated) transform to get there instead.
    // The error map turns zod's own wording into the same validation keys the
    // server sends back, so a field error reads the same whichever side
    // rejected it — and reads Russian for a Russian manager.
    resolver: zodResolver(schema, { errorMap: adminErrorMap }, { raw: true }),
    defaultValues,
  });

  /** The version the form stands on: the last upload's answer, else the one
   * the page loaded. Null while creating. */
  function currentVersion(): number | null {
    if (uploadedVersion !== null) return uploadedVersion;
    const loaded: unknown = getValues()[VERSION_FIELD];
    const parsed = typeof loaded === "string" && loaded !== "" ? Number(loaded) : NaN;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  // === Id autofill + availability hint (new rows only) ================================
  // The id field is only ever editable while creating — every page passes
  // `readOnly: !isNew` for it — so that flag is what tells autofill/the
  // availability check apart from an existing row's read-only id.
  const idFieldDef = fields.find(
    (f): f is Extract<EntityFieldDef<TIn>, { kind: "text" }> => f.kind === "text" && f.name === (ID_FIELD as Path<TIn>)
  );
  const isCreatingRow = idFieldDef !== undefined && !idFieldDef.readOnly;

  const watchedId = useWatch({ control, name: ID_FIELD as Path<TIn> }) as unknown;
  // Watching "id" itself when no `titleField` was given is harmless (the
  // value is simply never read below) and keeps this an unconditional hook call.
  const watchedTitleRaw = useWatch({ control, name: (titleField ?? (ID_FIELD as Path<TIn>)) as Path<TIn> });
  const watchedTitle = titleField && typeof watchedTitleRaw === "string" ? watchedTitleRaw : undefined;

  // The last slug this effect itself wrote — while the id field still holds
  // exactly that value, the manager hasn't diverged from the autofill yet, so
  // typing further in the title field is still allowed to keep overwriting it.
  const autoSlugRef = useRef("");
  useEffect(() => {
    if (!titleField || !isCreatingRow || watchedTitle === undefined) return;
    const currentId = typeof watchedId === "string" ? watchedId : "";
    if (currentId !== "" && currentId !== autoSlugRef.current) return;
    const nextSlug = toSlug(watchedTitle);
    if (nextSlug === currentId) return;
    autoSlugRef.current = nextSlug;
    setValue(ID_FIELD as Path<TIn>, nextSlug as PathValue<TIn, Path<TIn>>, { shouldDirty: nextSlug !== "" });
  }, [watchedTitle, titleField, isCreatingRow, watchedId, setValue]);

  const [idHint, setIdHint] = useState<"checking" | "available" | "taken" | null>(null);
  useEffect(() => {
    if (!table || !isCreatingRow) {
      setIdHint(null);
      return;
    }
    const id = typeof watchedId === "string" ? watchedId : "";
    if (!/^[a-z0-9-]+$/.test(id)) {
      setIdHint(null);
      return;
    }
    setIdHint("checking");
    const timer = setTimeout(() => {
      void checkContentIdAvailable(table, id).then((result) => {
        setIdHint(result.available ? "available" : "taken");
      });
    }, ID_CHECK_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [watchedId, table, isCreatingRow]);

  // === Preview drawer ==================================================================
  const [previewOpen, setPreviewOpen] = useState(false);
  const watchedValues = useWatch({ control }) as TIn;

  // === Unsaved-changes guard + Ctrl/Cmd+S ==============================================
  const { blocked, confirmLeave, cancelLeave } = useUnsavedChangesGuard({
    isDirty,
    onSave: () => void handleSubmit(submit)(),
  });

  function submit(raw: TIn) {
    if (inFlightRef.current || imageBusy) return;
    if (!online) {
      toast({ kind: "error", title: t("offline") });
      return;
    }
    inFlightRef.current = true;
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        const isCreate = currentVersion() === null;
        const values = schema.parse(
          uploadedVersion === null ? raw : { ...raw, [VERSION_FIELD]: String(uploadedVersion) }
        );
        const result = await onSubmit(values);
        if (!result.ok) {
          const { title, details, isConflict } = describeError(result);
          setError(details.length > 0 ? `${title}: ${details.join(", ")}` : title);
          if (result.gate) setGateResult(result.gate);
          toast({
            kind: "error",
            title: isConflict ? t("conflict") : title,
            action: isConflict ? { label: t("refresh"), onClick: () => router.refresh() } : undefined,
          });
          return;
        }
        setSuccess(true);
        toast({ kind: "success", title: t("saved") });
        const createdId: unknown = values["id"];
        router.push(
          editAfterCreate && isCreate && typeof createdId === "string"
            ? `${backHref}/${encodeURIComponent(createdId)}`
            : backHref
        );
        router.refresh();
      } finally {
        inFlightRef.current = false;
      }
    });
  }

  function renderField(field: EntityFieldDef<TIn>) {
    if (field.kind === "hidden") return <input key={field.name} type="hidden" {...register(field.name)} />;
    if (field.kind === "image") {
      return (
        <ImageUploadField
          key={field.name}
          inputId={field.name}
          label={field.label}
          rowId={field.rowId ?? null}
          currentSrc={field.currentSrc}
          currentAlt={field.currentAlt}
          getVersion={currentVersion}
          upload={field.upload}
          onUploaded={({ version }) => setUploadedVersion(version)}
          onBusyChange={setImageBusy}
        />
      );
    }

    const fieldError = errors[field.name as string];
    const raw = typeof fieldError?.message === "string" ? fieldError.message : undefined;
    const message = raw === undefined ? undefined : validationText(tValidation, raw);

    return (
      <div key={field.name} className="space-y-1.5">
        {field.kind === "checkbox" ? (
          <label className="flex items-center gap-2 text-[13px] font-medium text-primary-dark">
            <input
              type="checkbox"
              {...register(field.name)}
              className="h-4 w-4 rounded border-border text-accent focus:outline-none focus:ring-2 focus:ring-primary-light"
            />
            {field.label}
          </label>
        ) : (
          <label className="block text-[13px] font-medium text-primary-dark" htmlFor={field.name}>
            {field.label}
          </label>
        )}

        {field.kind === "text" && (
          <>
            <input
              id={field.name}
              type="text"
              placeholder={field.placeholder}
              readOnly={field.readOnly}
              {...register(field.name)}
              className={`w-full rounded-lg border border-border px-3 py-2 text-[13px] text-primary-dark placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light ${
                field.readOnly ? "bg-border/30 text-text-secondary" : "bg-surface-alt"
              }`}
            />
            {field.hint && <p className="text-[11px] text-text-secondary">{field.hint}</p>}
            {field.name === (ID_FIELD as Path<TIn>) && table && idHint && (
              <p
                className={`text-[11px] ${idHint === "taken" ? "text-status-outdated" : "text-text-secondary"}`}
              >
                {tForm(`idHint.${idHint}`)}
              </p>
            )}
          </>
        )}

        {field.kind === "csv" && (
          <>
            <input
              id={field.name}
              type="text"
              placeholder={field.placeholder}
              {...register(field.name)}
              className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-[13px] text-primary-dark placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light"
            />
            <p className="text-[11px] text-text-secondary">{field.hint}</p>
          </>
        )}

        {field.kind === "number" && (
          <input
            id={field.name}
            type="number"
            step={field.step ?? "any"}
            {...register(field.name)}
            className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-[13px] text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light"
          />
        )}

        {field.kind === "textarea" && (
          <textarea
            id={field.name}
            rows={field.rows ?? 4}
            {...register(field.name)}
            className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-[13px] text-primary-dark placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light"
          />
        )}

        {field.kind === "select" && (
          <select
            id={field.name}
            {...register(field.name)}
            className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-[13px] text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light"
          >
            {field.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {message && <p className="text-[11px] text-status-outdated">{message}</p>}
      </div>
    );
  }

  const mainFields = fields.filter((f) => f.group !== "ru");
  const ruFields = fields.filter((f) => f.group === "ru");

  return (
    <form onSubmit={handleSubmit(submit)} className="max-w-2xl space-y-4">
      {error && (
        <div className="rounded-xl border border-status-outdated/40 bg-status-outdated/10 px-4 py-2.5 text-[13px] text-primary-dark">
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-status-ok/40 bg-status-ok/10 px-4 py-2.5 text-[13px] text-status-ok">
          <CheckCircle2 size={15} />
          {tForm("saved")}
        </div>
      )}

      {mainFields.map(renderField)}

      {ruFields.length > 0 && (
        <details ref={ruDetailsRef} className="rounded-xl border border-border bg-surface-alt/60 p-3.5">
          <summary className="cursor-pointer text-[13px] font-medium text-primary-dark">
            {tForm("ruSection")}
          </summary>
          <div className="mt-3 space-y-4">{ruFields.map(renderField)}</div>
        </details>
      )}

      <div className="flex items-center gap-2 pt-2">
        <SubmitButton pending={pending} disabled={imageBusy} offlineBlocked={!online} pendingLabel={tForm("saving")}>
          {tForm("save")}
        </SubmitButton>
        {renderPreview && (
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-primary-dark transition-colors hover:bg-surface-alt"
          >
            {tForm("preview")}
          </button>
        )}
        <Link
          href={backHref}
          className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-primary-dark transition-colors hover:bg-surface-alt"
        >
          {tForm("cancel")}
        </Link>
      </div>

      <GateReportDialog result={gateResult} onClose={() => setGateResult(null)} />

      <ConfirmDialog
        open={blocked}
        title={tConfirm("leaveUnsavedTitle")}
        description={tConfirm("leaveUnsavedDescription")}
        confirmLabel={tConfirm("leaveAnyway")}
        tone="primary"
        onConfirm={confirmLeave}
        onCancel={cancelLeave}
      />

      {renderPreview?.(watchedValues, previewOpen, () => setPreviewOpen(false))}
    </form>
  );
}
