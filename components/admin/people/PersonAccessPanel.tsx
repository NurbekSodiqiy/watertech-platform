"use client";

import { useEffect, useId, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { KeyRound, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ChartCard } from "@/components/admin/charts/ChartCard";
import { setActive, setRole } from "@/lib/admin/actions/users";
import type { ActionResult } from "@/lib/admin/errors";
import { ASSIGNABLE_ROLES, type AssignableRole } from "@/lib/admin/users";
import { useActionError } from "@/hooks/useActionError";
import { useOnline } from "@/hooks/useOnline";
import { useToast } from "@/hooks/useToast";

// Only mounted once "Remove employee" is pressed.
const RemovePersonDialog = dynamic(
  () => import("@/components/admin/people/RemovePersonDialog").then((m) => m.RemovePersonDialog),
  { ssr: false }
);

/** What the admin asked for, waiting for their confirmation. */
type PendingChange = { kind: "role"; next: AssignableRole } | { kind: "active"; next: boolean };

export interface PersonAccessPanelProps {
  email: string;
  /** How the dialogs name the person (full name, else the email). */
  name: string;
  role: AssignableRole;
  isActive: boolean;
  /** The signed-in admin is this person: read-only, like their table row. */
  isSelf: boolean;
}

/**
 * "Kirish huquqi" on the person page: switch the role operator ↔ manager and
 * turn the person's access on or off. The same Server Actions as the table
 * (setRole / setActive, which re-validate with zod, check the admin session
 * and the allow-list guard, and answer an error *code*), each behind a
 * ConfirmDialog that says what happens right away; a failure is shown with
 * useActionError's copy. Below them, a danger zone removes the person
 * altogether (RemovePersonDialog, 0022); after that this page no longer
 * exists, so it goes back to the directory. An admin row never gets this panel
 * (the page shows the locked note instead: admin rows are SQL-editor-only,
 * WT462), and the caller's own row is read-only (WT461) and has no danger
 * zone. Nothing this component disables or hides is a protection — only a
 * courtesy in front of the database's own refusals.
 */
export function PersonAccessPanel({ email, name, role, isActive, isSelf }: PersonAccessPanelProps) {
  const router = useRouter();
  const online = useOnline();
  const { toast } = useToast();
  const describeError = useActionError();
  const t = useTranslations("pages.admin.people.access");
  const tUsers = useTranslations("pages.admin.users");
  const tRemove = useTranslations("pages.admin.people.remove");
  const tToast = useTranslations("toast");
  const selfNoteId = useId();
  const statusLabelId = useId();
  const dangerTitleId = useId();

  const [confirm, setConfirm] = useState<PendingChange | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // What was just saved, shown until the refreshed page brings the same value
  // back — otherwise the controls snap to the old state mid-refresh.
  const [roleOverride, setRoleOverride] = useState<AssignableRole | null>(null);
  const [activeOverride, setActiveOverride] = useState<boolean | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  // Kept mounted after the first open so the dialog's exit animation can run.
  const [removeMounted, setRemoveMounted] = useState(false);

  useEffect(() => setRoleOverride(null), [role]);
  useEffect(() => setActiveOverride(null), [isActive]);

  const shownRole = roleOverride ?? role;
  const shownActive = activeOverride ?? isActive;
  const locked = isSelf || pending;

  function ask(change: PendingChange) {
    if (!online) {
      toast({ kind: "error", title: tToast("offline") });
      return;
    }
    setError(null);
    setConfirm(change);
  }

  function openRemove() {
    setError(null);
    setRemoveMounted(true);
    setRemoveOpen(true);
  }

  function onRemoved() {
    // This person's page is gone with them (a 404 now): back to the list,
    // re-read rather than taken from the router cache.
    setRemoveOpen(false);
    router.replace("/admin/users");
    router.refresh();
  }

  function run(action: () => Promise<ActionResult>, success: string, onSaved: () => void) {
    startTransition(async () => {
      const result = await action();
      setConfirm(null);
      if (!result.ok) {
        const { title } = describeError(result);
        setError(title);
        toast({ kind: "error", title });
        // The allow-list row did change; only the Supabase Auth half needs a
        // retry, and the page should show the row as it now is.
        if (result.code === "auth_sync_failed") router.refresh();
        return;
      }
      onSaved();
      toast({ kind: "success", title: success });
      router.refresh();
    });
  }

  function confirmChange() {
    if (!confirm) return;
    if (confirm.kind === "role") {
      const { next } = confirm;
      run(() => setRole(email, next), tUsers("toastRoleChanged"), () => setRoleOverride(next));
    } else {
      const { next } = confirm;
      run(
        () => setActive(email, next),
        next ? tUsers("toastActivated") : tUsers("toastDeactivated"),
        () => setActiveOverride(next)
      );
    }
  }

  const dialogTitle =
    confirm?.kind === "role"
      ? t("roleTitle")
      : confirm?.next
        ? tUsers("activateTitle")
        : tUsers("deactivateTitle");
  const dialogDescription = !confirm
    ? ""
    : confirm.kind === "role"
      ? t("roleDescription", { name, role: tUsers(`roles.${confirm.next}`) })
      : confirm.next
        ? tUsers("activateDescription", { name, role: tUsers(`roles.${shownRole}`) })
        : tUsers("deactivateDescription", { name });
  const dialogConfirmLabel =
    confirm?.kind === "role" ? t("roleConfirm") : confirm?.next ? tUsers("activate") : tUsers("deactivate");

  return (
    <>
      <ChartCard icon={KeyRound} title={t("title")} description={t("description")}>
        <div className="space-y-5">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-status-outdated/40 bg-status-outdated/10 px-4 py-2.5 text-[13px] text-primary-dark"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-[13px] font-medium text-primary-dark">{t("role.label")}</p>
            <div
              role="group"
              aria-label={t("role.label")}
              aria-describedby={isSelf ? selfNoteId : undefined}
              className="inline-flex rounded-lg border border-border bg-surface-alt p-0.5"
            >
              {ASSIGNABLE_ROLES.map((option) => {
                const selected = shownRole === option;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={selected}
                    disabled={locked}
                    onClick={() => {
                      if (!selected) ask({ kind: "role", next: option });
                    }}
                    className={`rounded-lg px-4 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed ${
                      selected
                        ? "bg-primary text-on-accent"
                        : "text-text-secondary hover:bg-surface hover:text-primary-dark disabled:hover:bg-transparent"
                    } ${locked && !selected ? "opacity-60" : ""}`}
                  >
                    {tUsers(`roles.${option}`)}
                  </button>
                );
              })}
            </div>
            <p className="text-[12px] text-text-secondary">{t("role.hint")}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p id={statusLabelId} className="text-[13px] font-medium text-primary-dark">
                  {t("status.label")}
                </p>
                <p className="text-[12.5px] text-text-secondary">
                  {shownActive ? tUsers("status.active") : tUsers("status.inactive")}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={shownActive}
                aria-labelledby={statusLabelId}
                aria-describedby={isSelf ? selfNoteId : undefined}
                disabled={locked}
                onClick={() => ask({ kind: "active", next: !shownActive })}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60 ${
                  shownActive ? "border-transparent bg-primary" : "border-border bg-border/60"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-block h-4 w-4 rounded-full transition-transform ${
                    shownActive ? "translate-x-6 bg-on-accent" : "translate-x-1 bg-text-secondary"
                  }`}
                />
              </button>
            </div>
            <p className="text-[12px] text-text-secondary">{t("status.hint")}</p>
          </div>

          {isSelf && (
            <p id={selfNoteId} className="flex items-center gap-1.5 text-[12px] text-text-secondary">
              <Lock size={12} aria-hidden="true" className="shrink-0" />
              {tUsers("selfLocked")}
            </p>
          )}

          {!isSelf && (
            <section
              aria-labelledby={dangerTitleId}
              className="space-y-2 rounded-xl border border-status-outdated/40 px-4 py-3"
            >
              <h3 id={dangerTitleId} className="text-[13px] font-semibold text-primary-dark">
                {tRemove("dangerZone.title")}
              </h3>
              <p className="text-[12px] text-text-secondary">{tRemove("dangerZone.description")}</p>
              <button
                type="button"
                onClick={openRemove}
                disabled={pending}
                className="rounded-lg border border-status-outdated bg-status-outdated/15 px-3.5 py-2 text-[13px] font-medium text-primary-dark transition-colors hover:bg-status-outdated/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {tRemove("dangerZone.button")}
              </button>
            </section>
          )}
        </div>
      </ChartCard>

      <ConfirmDialog
        open={confirm !== null}
        title={dialogTitle}
        description={dialogDescription}
        confirmLabel={dialogConfirmLabel}
        tone={confirm?.kind === "active" && !confirm.next ? "danger" : "primary"}
        pending={pending}
        onConfirm={confirmChange}
        onCancel={() => setConfirm(null)}
      />

      {removeMounted && (
        <RemovePersonDialog
          open={removeOpen}
          person={{ email, name }}
          onClose={() => setRemoveOpen(false)}
          onRemoved={onRemoved}
        />
      )}
    </>
  );
}
