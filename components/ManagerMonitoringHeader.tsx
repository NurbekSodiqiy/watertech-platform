"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useRouter } from "@/i18n/routing";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { signOutAndRedirect } from "@/lib/auth/sign-out";

// Independent header for the manager-only monitoring area — deliberately
// not TopBar/AvatarMenu (those are design-locked, AGENTS.md), so this is a
// small, self-contained duplicate of just the "sign out" logic instead of
// importing from them.
export function ManagerMonitoringHeader({
  notificationsSlot,
}: {
  /** Server-rendered NotificationsBell — passed in because this header is a Client Component. */
  notificationsSlot?: ReactNode;
}) {
  const t = useTranslations("dashboard");
  const router = useRouter();

  async function handleSignOut() {
    await signOutAndRedirect(router);
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur">
      <div className="flex shrink-0 items-center gap-2">
        <Logo className="h-7 w-7 shrink-0" />
        <span className="text-sm font-semibold text-primary-dark">{t("title")}</span>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        {notificationsSlot}
        <Link
          href="/admin"
          className="rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-primary-dark transition-colors hover:bg-surface-alt"
        >
          {t("header.content")}
        </Link>
        <ThemeToggle />
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-primary-dark transition-colors hover:bg-surface-alt"
        >
          <LogOut size={15} className="text-text-secondary" />
          {t("header.signOut")}
        </button>
      </div>
    </header>
  );
}
