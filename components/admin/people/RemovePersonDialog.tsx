"use client";

import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { removeUser } from "@/lib/admin/actions/users";
import { EMAIL_MAX_LENGTH, normalizeConfirmEmail } from "@/lib/admin/users";
import { useActionError } from "@/hooks/useActionError";
import { useOnline } from "@/hooks/useOnline";
import { useToast } from "@/hooks/useToast";

/** Who the dialog is about: the allow-list email (lowercase) and how to name
 * them (full name, else the email). */
export interface RemovePersonTarget {
  email: string;
  name: string;
}

export interface RemovePersonDialogProps {
  open: boolean;
  /** Kept while the dialog closes, so its text does not blank mid-animation. */
  person: RemovePersonTarget | null;
  onClose: () => void;
  /** The person is off the list — removed now, or already gone (`not_found`).
   * The caller re-reads (router.refresh) or leaves their page. */
  onRemoved: () => void;
}

const INPUT_CLASS =
  "w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-[13px] text-primary-dark placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light disabled:opacity-60";

/**
 * "Remove employee" — for someone who left. Built on ConfirmDialog (an
 * alertdialog with its focus trap), with the consequences spelled out, an
 * opt-in to delete their activity history (off by default: it cannot be
 * undone), and the email typed again before the danger button enables.
 *
 * `removeUser` re-checks all of it on the server — the typed email included —
 * and the database again; nothing here is a protection. A failure keeps the
 * dialog open with the reason; every step of the removal is idempotent, so
 * pressing the button again is the retry. `auth_sync_failed` reads differently
 * here than after a deactivation: the Supabase Auth account comes first in a
 * removal, so nothing has changed yet.
 */
export function RemovePersonDialog({ open, person, onClose, onRemoved }: RemovePersonDialogProps) {
  const t = useTranslations("pages.admin.people.remove");
  const tToast = useTranslations("toast");
  const describeError = useActionError();
  const online = useOnline();
  const { toast } = useToast();
  const purgeId = useId();
  const purgeHintId = useId();
  const confirmId = useId();
  const confirmHintId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [purgeHistory, setPurgeHistory] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const email = person?.email ?? "";

  // A fresh form every time it opens: one dialog serves every card and row.
  useEffect(() => {
    if (!open) return;
    setPurgeHistory(false);
    setTyped("");
    setError(null);
  }, [open, email]);

  // After a refusal, back to the field: the button that had focus was
  // disabled while the action ran, and Enter there is the retry.
  useEffect(() => {
    if (error && !pending) inputRef.current?.focus();
  }, [error, pending]);

  const matches = person !== null && normalizeConfirmEmail(typed) === person.email;

  function cancel() {
    if (!pending) onClose();
  }

  function submit() {
    if (!person || !matches || pending) return;
    if (!online) {
      toast({ kind: "error", title: tToast("offline") });
      return;
    }
    const target = person.email;
    const purge = purgeHistory;
    const confirmation = typed;
    setError(null);
    startTransition(async () => {
      const result = await removeUser(target, purge, confirmation);
      if (result.ok) {
        toast({ kind: "success", title: purge ? tToast("personRemovedWithHistory") : tToast("personRemoved") });
        onRemoved();
        return;
      }
      if (result.code === "not_found") {
        // Already off the list (a retry after the first attempt finished, or
        // another tab): the list has to catch up either way.
        toast({ kind: "error", title: describeError(result).title });
        onRemoved();
        return;
      }
      setError(result.code === "auth_sync_failed" ? t("authFailed") : describeError(result).title);
    });
  }

  function onConfirmKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  }

  return (
    <ConfirmDialog
      open={open}
      title={t("title")}
      description={person ? t("description", { name: person.name, email: person.email }) : ""}
      confirmLabel={t("confirm")}
      tone="danger"
      pending={pending}
      confirmDisabled={!matches}
      initialFocusRef={inputRef}
      onConfirm={submit}
      onCancel={cancel}
    >
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-status-outdated/40 bg-status-outdated/10 px-4 py-2.5 text-[13px] text-primary-dark"
        >
          {error}
        </div>
      )}

      <ul className="list-disc space-y-1 pl-5 text-[12.5px] text-text-secondary">
        <li>{t("consequences.accessEnds")}</li>
        <li>{t("consequences.googleUnlinked")}</li>
        <li>{t("consequences.canReAdd")}</li>
        <li>{t("consequences.auditKept")}</li>
      </ul>

      <div className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-alt px-3 py-2.5">
        <input
          id={purgeId}
          type="checkbox"
          checked={purgeHistory}
          onChange={(event) => setPurgeHistory(event.target.checked)}
          disabled={pending}
          aria-describedby={purgeHintId}
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
        />
        <div className="min-w-0">
          <label htmlFor={purgeId} className="block text-[13px] font-medium text-primary-dark">
            {t("purge.label")}
          </label>
          <p id={purgeHintId} className="mt-0.5 text-[12px] text-text-secondary">
            {t("purge.hint")}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={confirmId} className="block text-[13px] font-medium text-primary-dark">
          {t("confirmEmail.label")}
        </label>
        <input
          ref={inputRef}
          id={confirmId}
          type="text"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={EMAIL_MAX_LENGTH}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          onKeyDown={onConfirmKeyDown}
          disabled={pending}
          aria-describedby={confirmHintId}
          className={INPUT_CLASS}
        />
        <p id={confirmHintId} className="break-all text-[12px] text-text-secondary">
          {t.rich("confirmEmail.hint", {
            email,
            strong: (chunks) => <span className="font-semibold text-primary-dark">{chunks}</span>,
          })}
        </p>
      </div>
    </ConfirmDialog>
  );
}
