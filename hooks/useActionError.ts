"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { validationText } from "@/lib/admin/validation";
import type { ActionFailure } from "@/lib/admin/errors";

export interface ActionErrorText {
  /** One line naming what went wrong, in the reader's locale. */
  title: string;
  /** Per-issue specifics: a validation key resolved through
   * `admin.validation.*`, or a literal the server sent (an id a reference
   * check could not resolve). Empty for most failures. */
  details: string[];
  /** Someone else saved first — the caller offers "refresh" instead of a
   * plain error, so the manager can reload and redo the edit. */
  isConflict: boolean;
}

/** Turns an admin Server Action failure into copy. Every admin write returns
 * a code, never a sentence (lib/admin/errors.ts), so this is the one place
 * that decides how a code reads — and the reason a Russian manager sees
 * Russian without the server knowing the locale. */
export function useActionError(): (failure: ActionFailure) => ActionErrorText {
  const tError = useTranslations("admin.errors");
  const tValidation = useTranslations("admin.validation");

  return useCallback(
    (failure: ActionFailure): ActionErrorText => ({
      title: tError(failure.code),
      details: (failure.details ?? []).map((detail) => validationText(tValidation, detail)),
      isConflict: failure.code === "version_conflict",
    }),
    [tError, tValidation]
  );
}
