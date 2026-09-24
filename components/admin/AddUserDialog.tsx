"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Dialog } from "@/components/ui/Dialog";
import { addUser } from "@/lib/admin/actions/users";
import {
  ASSIGNABLE_ROLES,
  EMAIL_MAX_LENGTH,
  FULL_NAME_MAX_LENGTH,
  addUserSchema,
  isAssignableRole,
  type AssignableRole,
} from "@/lib/admin/users";
import { adminErrorMap, validationText } from "@/lib/admin/validation";
import { useActionError } from "@/hooks/useActionError";
import { useOnline } from "@/hooks/useOnline";
import { useToast } from "@/hooks/useToast";

type Field = "email" | "fullName" | "role";
type FieldErrors = Partial<Record<Field, string>>;

function isField(value: unknown): value is Field {
  return value === "email" || value === "fullName" || value === "role";
}

const INPUT_CLASS =
  "w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-[13px] text-primary-dark placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light";

/**
 * "Add a person to the allow-list": email, optional full name, role. Checked
 * here with the same zod schema the Server Action parses with (the email is
 * trimmed and lowercased by it), then written by `addUser`, which answers
 * `email_taken` for an address that already has a row — shown on the field,
 * since the fix is in the admin's hands. The role is operator or manager only:
 * an admin is added in the SQL editor (ASSIGNABLE_ROLES, WT462).
 */
export function AddUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const online = useOnline();
  const { toast } = useToast();
  const describeError = useActionError();
  const t = useTranslations("pages.admin.users");
  const tDialog = useTranslations("pages.admin.users.dialog");
  const tValidation = useTranslations("admin.validation");
  const tToast = useTranslations("toast");
  const titleId = useId();
  const descriptionId = useId();
  const emailId = useId();
  const nameId = useId();
  const roleId = useId();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AssignableRole>("operator");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setEmail("");
    setFullName("");
    setRole("operator");
    setFieldErrors({});
    setFormError(null);
  }

  function close() {
    if (pending) return;
    reset();
    onClose();
  }

  function finish() {
    reset();
    onClose();
    router.refresh();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = addUserSchema.safeParse({ email, role, fullName }, { errorMap: adminErrorMap });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (isField(field) && !next[field]) next[field] = validationText(tValidation, issue.message);
      }
      setFieldErrors(next);
      return;
    }
    if (!online) {
      toast({ kind: "error", title: tToast("offline") });
      return;
    }

    setFieldErrors({});
    setFormError(null);
    startTransition(async () => {
      const result = await addUser(parsed.data.email, parsed.data.role, parsed.data.fullName);
      if (result.ok) {
        toast({ kind: "success", title: t("toastAdded") });
        finish();
        return;
      }

      const { title, details } = describeError(result);
      if (result.code === "email_taken") {
        setFieldErrors({ email: title });
      } else if (result.code === "validation" && isField(result.field)) {
        setFieldErrors({ [result.field]: details[0] ?? title });
      } else if (result.code === "auth_sync_failed") {
        // The row exists now; only lifting an old Auth ban did not go through.
        toast({ kind: "error", title });
        finish();
      } else {
        setFormError(title);
      }
    });
  }

  function errorId(field: Field): string | undefined {
    return fieldErrors[field] ? `${field === "email" ? emailId : field === "fullName" ? nameId : roleId}-error` : undefined;
  }

  // `contents`: the caller renders this inside a space-y-* stack (see
  // GateReportDialog for why the fixed layer must not take a margin).
  return (
    <div className="contents">
      <Dialog
        open={open}
        onClose={close}
        labelledBy={titleId}
        describedBy={descriptionId}
        panelClassName="w-full max-w-md rounded-2xl border border-border bg-surface shadow-soft"
      >
        <form onSubmit={submit} noValidate>
          <div className="flex items-start gap-3 border-b border-border p-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserPlus size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p id={titleId} className="text-[14px] font-semibold text-primary-dark">
                {tDialog("title")}
              </p>
              <p id={descriptionId} className="mt-1 text-[13px] text-text-secondary">
                {tDialog("description")}
              </p>
            </div>
          </div>

          <div className="space-y-4 p-5">
            {formError && (
              <div
                role="alert"
                className="rounded-xl border border-status-outdated/40 bg-status-outdated/10 px-4 py-2.5 text-[13px] text-primary-dark"
              >
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor={emailId} className="block text-[13px] font-medium text-primary-dark">
                {tDialog("email")}
              </label>
              <input
                id={emailId}
                type="email"
                inputMode="email"
                autoComplete="off"
                spellCheck={false}
                maxLength={EMAIL_MAX_LENGTH}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={tDialog("emailPlaceholder")}
                aria-invalid={fieldErrors.email ? true : undefined}
                aria-describedby={errorId("email")}
                className={INPUT_CLASS}
              />
              {fieldErrors.email && (
                <p id={errorId("email")} className="text-[11px] text-status-outdated">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor={nameId} className="block text-[13px] font-medium text-primary-dark">
                {tDialog("fullName")}
              </label>
              <input
                id={nameId}
                type="text"
                autoComplete="off"
                maxLength={FULL_NAME_MAX_LENGTH}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={tDialog("fullNamePlaceholder")}
                aria-invalid={fieldErrors.fullName ? true : undefined}
                aria-describedby={errorId("fullName")}
                className={INPUT_CLASS}
              />
              {fieldErrors.fullName && (
                <p id={errorId("fullName")} className="text-[11px] text-status-outdated">
                  {fieldErrors.fullName}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor={roleId} className="block text-[13px] font-medium text-primary-dark">
                {tDialog("role")}
              </label>
              <select
                id={roleId}
                value={role}
                onChange={(e) => {
                  const value = e.target.value;
                  if (isAssignableRole(value)) setRole(value);
                }}
                aria-describedby={`${roleId}-hint`}
                className={INPUT_CLASS}
              >
                {ASSIGNABLE_ROLES.map((option) => (
                  <option key={option} value={option}>
                    {t(`roles.${option}`)}
                  </option>
                ))}
              </select>
              <p id={`${roleId}-hint`} className="text-[11px] text-text-secondary">
                {tDialog("roleHint")}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border p-4">
            <button
              type="button"
              onClick={close}
              disabled={pending}
              className="rounded-lg border border-border px-3.5 py-2 text-[13px] font-medium text-primary-dark transition-colors hover:bg-surface-alt disabled:opacity-50"
            >
              {tDialog("cancel")}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-primary px-3.5 py-2 text-[13px] font-medium text-surface transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {pending ? tDialog("submitting") : tDialog("submit")}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
