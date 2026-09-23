"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ManagerAreaSwitch } from "@/components/admin/ManagerAreaSwitch";
import { useSessionUser } from "@/hooks/useSessionUser";
import { signOutAndPurge } from "@/lib/auth/sign-out";

// Independent header for the manager-only monitoring area — deliberately
// not TopBar/AvatarMenu (those are design-locked, AGENTS.md), so this is a
// small, self-contained duplicate of just the "sign out" logic instead of
// importing from them. The Dashboard ↔ Admin switch is shared with AdminShell
// (lib/admin/nav.ts), so the two headers cannot drift apart.
export function ManagerMonitoringHeader({
  notificationsSlot,
}: {
  /** Server-rendered NotificationsBell — passed in because this header is a Client Component. */
  notificationsSlot?: ReactNode;
}) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { user } = useSessionUser();

  async function handleSignOut() {
    await signOutAndPurge({ locale, email: user?.email });
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface/95 px-4 backdrop-blur sm:gap-3">
      <div className="flex shrink-0 items-center gap-2">
        <Logo className="h-7 w-7 shrink-0" />
        <span className="hidden text-sm font-semibold text-primary-dark sm:inline">{t("title")}</span>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        {notificationsSlot}
        <ManagerAreaSwitch />
        <ThemeToggle />
        <button
          onClick={handleSignOut}
          aria-label={t("header.signOut")}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-primary-dark transition-colors hover:bg-surface-alt"
        >
          <LogOut size={15} className="text-text-secondary" />
          <span className="hidden sm:inline">{t("header.signOut")}</span>
        </button>
      </div>
    </header>
  );
}
