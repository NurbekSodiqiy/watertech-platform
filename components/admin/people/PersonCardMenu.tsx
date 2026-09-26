"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import type { DirectoryPerson } from "@/lib/admin/directory";
import { personPath } from "@/lib/admin/people";

export interface PersonCardMenuProps {
  person: DirectoryPerson;
  /** How the button's label names the person (full name, else the email). */
  name: string;
  onToggleActive: (person: DirectoryPerson) => void;
  onRemove: (person: DirectoryPerson) => void;
}

// A tinted row on hover, and an inset ring for keyboard focus — a background
// alone (surface-alt on surface) is too faint to be the focus indicator.
const ITEM_CLASS =
  "flex w-full items-center rounded-lg px-3 py-2 text-left text-[13px] font-medium text-primary-dark transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary";
const DANGER_ITEM_CLASS =
  "flex w-full items-center rounded-lg px-3 py-2 text-left text-[13px] font-medium text-primary-dark transition-colors hover:bg-status-outdated/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary";

/**
 * The ⋯ menu on a person's card: open their page, turn their access off or on,
 * remove them. A menu button in the WAI-ARIA sense — Enter / Space / ArrowDown
 * open it on the first item, ArrowUp on the last; ArrowUp / ArrowDown / Home /
 * End move between items; Escape closes it and gives focus back to the button,
 * Tab closes it and moves on, a click anywhere else closes it. The card itself
 * is a link, so this sits next to it (PersonCard), never inside it.
 *
 * Choosing Deactivate / Activate / Remove closes the menu and returns focus to
 * the button before the directory opens its dialog, so the dialog's focus trap
 * gives focus back to the button when it closes. Nothing here fetches and the
 * profile link does not prefetch. PersonCard renders this only for a row the
 * admin may change — never an admin's, never their own.
 */
export function PersonCardMenu({ person, name, onToggleActive, onRemove }: PersonCardMenuProps) {
  const t = useTranslations("pages.admin.people.card.menu");
  const tUsers = useTranslations("pages.admin.users");
  const tRemove = useTranslations("pages.admin.people.remove");
  const menuId = useId();
  const [open, setOpen] = useState(false);
  /** Which item gets focus when the menu opens: the first, or (ArrowUp) the last. */
  const [startAt, setStartAt] = useState<"first" | "last">("first");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    const items = itemRefs.current.filter((item): item is HTMLElement => item !== null);
    (startAt === "last" ? items[items.length - 1] : items[0])?.focus();

    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      // The click goes wherever it was aimed; focus is not pulled back.
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, startAt]);

  function openAt(position: "first" | "last") {
    setStartAt(position);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  function choose(action: (person: DirectoryPerson) => void) {
    close();
    action(person);
  }

  function onButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openAt("first");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openAt("last");
    }
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = itemRefs.current.filter((item): item is HTMLElement => item !== null);
    const index = items.findIndex((item) => item === document.activeElement);
    let next: number;
    switch (event.key) {
      case "ArrowDown":
        next = (index + 1) % items.length;
        break;
      case "ArrowUp":
        next = (index - 1 + items.length) % items.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = items.length - 1;
        break;
      case "Escape":
        event.preventDefault();
        close();
        return;
      case "Tab":
        // Focus goes back to the button first, so the browser's own Tab moves
        // on from there — to the next card — once the menu is gone.
        close();
        return;
      default:
        return;
    }
    event.preventDefault();
    items[next]?.focus();
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={t("label", { name })}
        onClick={() => (open ? setOpen(false) : openAt("first"))}
        onKeyDown={onButtonKeyDown}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-alt hover:text-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={t("label", { name })}
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-full z-20 mt-1 w-52 rounded-xl border border-border bg-surface p-1 shadow-soft"
        >
          <Link
            ref={(node) => {
              itemRefs.current[0] = node;
            }}
            href={personPath(person.email)}
            prefetch={false}
            role="menuitem"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className={ITEM_CLASS}
          >
            {t("openProfile")}
          </Link>
          <button
            ref={(node) => {
              itemRefs.current[1] = node;
            }}
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => choose(onToggleActive)}
            className={ITEM_CLASS}
          >
            {person.isActive ? tUsers("deactivate") : tUsers("activate")}
          </button>
          <div role="separator" className="my-1 border-t border-border" />
          <button
            ref={(node) => {
              itemRefs.current[2] = node;
            }}
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => choose(onRemove)}
            className={DANGER_ITEM_CLASS}
          >
            {tRemove("action")}
          </button>
        </div>
      )}
    </div>
  );
}
