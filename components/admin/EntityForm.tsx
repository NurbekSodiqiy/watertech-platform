"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { useForm, type DefaultValues, type FieldValues, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodType, ZodTypeDef } from "zod";
import { CheckCircle2 } from "lucide-react";
import type { ActionResult } from "@/lib/admin/actions/guard";

export type EntityFieldDef<TIn extends FieldValues> =
  | { kind: "text"; name: Path<TIn>; label: string; placeholder?: string; readOnly?: boolean }
  | { kind: "textarea"; name: Path<TIn>; label: string; rows?: number }
  | { kind: "number"; name: Path<TIn>; label: string; step?: string }
  | { kind: "checkbox"; name: Path<TIn>; label: string }
  | { kind: "select"; name: Path<TIn>; label: string; options: { value: string; label: string }[] }
  | { kind: "csv"; name: Path<TIn>; label: string; placeholder?: string; hint: string };

/** Config-driven create/edit form shared by every admin section —
 * react-hook-form + zodResolver on the same schema the server action
 * re-validates with (see lib/admin/schemas.ts), so client and server agree
 * on field shape. `TIn` is the schema's raw input type (what the HTML
 * inputs bind to — comma-joined strings for array fields, etc.); `TOut` is
 * what zodResolver produces after parsing, which is what `onSubmit`
 * receives and matches the *Write schema the server action expects. */
export function EntityForm<TIn extends FieldValues, TOut extends FieldValues>({
  schema,
  defaultValues,
  fields,
  onSubmit,
  backHref,
}: {
  schema: ZodType<TOut, ZodTypeDef, TIn>;
  defaultValues: DefaultValues<TIn>;
  fields: EntityFieldDef<TIn>[];
  onSubmit: (values: TOut) => Promise<ActionResult>;
  backHref: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TIn>({
    // raw: true — zodResolver still runs `schema` for validation (so field
    // errors surface below), but hands handleSubmit the untransformed input
    // instead of the parsed TOut. The installed @hookform/resolvers version
    // predates RHF's separate-output-type generic, so there's no type-safe
    // way for it to hand back TOut directly; schema.parse below redoes the
    // (already-validated) transform to get there instead.
    resolver: zodResolver(schema, undefined, { raw: true }),
    defaultValues,
  });

  function submit(raw: TIn) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const values = schema.parse(raw);
      const result = await onSubmit(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      router.push(backHref);
      router.refresh();
    });
  }

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
          Saqlandi
        </div>
      )}

      {fields.map((field) => {
        const fieldError = errors[field.name as string];
        const message = typeof fieldError?.message === "string" ? fieldError.message : undefined;

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
      })}

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
          onClick={() => router.push(backHref)}
          className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-primary-dark transition-colors hover:bg-surface-alt"
        >
          Bekor qilish
        </button>
      </div>
    </form>
  );
}
