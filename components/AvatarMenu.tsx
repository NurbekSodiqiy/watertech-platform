"use client";

import { useEffect, useRef, useState } from "react";
import { Database, LogOut } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useSessionUser } from "@/hooks/useSessionUser";
import { signOutAndPurge } from "@/lib/auth/sign-out";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// TODO: boshqa menyu bandlari (profilni ko'rish, hisob sozlamalari,
// hamkasbni taklif qilish) shu yerga qo'shilganda qaytariladi — hozircha
// faqat "Chiqish" ishlaydi, boshqalari real funksiyaga ega bo'lmagani
// sabab avval olib tashlangan edi.
export function AvatarMenu() {
  const locale = useLocale();
  const { user } = useSessionUser();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const t = useTranslations("avatarMenu");

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    // Escape returns focus to the avatar button, so keyboard users aren't
    // dropped back at the top of the document.
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleSignOut() {
    await signOutAndPurge({ locale, email: user?.email });
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("menuLabel")}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-surface shadow-softer"
      >
        {user ? getInitials(user.name) : "?"}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          {/* The identity block sits outside role="menu" on purpose: a menu
              may only own menuitem-ish children, and this is static text. */}
          {user && (
            <div className="border-b border-border px-4 py-3">
              <p className="truncate text-[13px] font-semibold text-primary-dark">{user.name}</p>
              <p className="truncate text-[12px] text-text-secondary">{user.email}</p>
            </div>
          )}
          <div role="menu" aria-label={t("menuLabel")}>
            {/* The admin previews the operator app from here; this is their
                way back. Nobody else may open /admin (middleware), so nobody
                else is offered it. */}
            {user?.role === "admin" && (
              <Link
                href="/admin"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-medium text-primary-dark hover:bg-surface-alt"
              >
                <Database size={15} aria-hidden="true" className="text-text-secondary" />
                {t("adminPanel")}
              </Link>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-medium text-primary-dark hover:bg-surface-alt"
            >
              <LogOut size={15} aria-hidden="true" className="text-text-secondary" />
              {t("signOut")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
