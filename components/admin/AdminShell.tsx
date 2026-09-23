"use client";

import type { ReactNode } from "react";
import { Link } from "@/i18n/routing";
import { usePathname } from "@/i18n/routing";
import { LogOut } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ManagerAreaSwitch } from "@/components/admin/ManagerAreaSwitch";
import { useSessionUser } from "@/hooks/useSessionUser";
import { signOutAndPurge } from "@/lib/auth/sign-out";
import { isNavItemActive, managerArea } from "@/lib/admin/nav";

const ADMIN_NAV_ITEMS = managerArea("admin").items;

/** Manager-only admin shell — structurally its own thing (sticky header +
 * left nav), deliberately not built from AppShell/Sidebar (design-locked,
 * see CLAUDE.md section 6) even though the row styling below mirrors them:
 * rounded-2xl rows, text-[13.5px] labels, the same token palette. */
export function AdminShell({
  children,
  notificationsSlot,
}: {
  children: ReactNode;
  /** Server-rendered NotificationsBell — passed in because this shell is a Client Component. */
  notificationsSlot?: ReactNode;
}) {
  const pathname = usePathname();
  const locale = useLocale();
  const { user } = useSessionUser();
  const tAdmin = useTranslations("pages.admin");
  const tShell = useTranslations("admin.shell");

  async function handleSignOut() {
    await signOutAndPurge({ locale, email: user?.email });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface/95 px-4 backdrop-blur sm:gap-3">
        <div className="flex shrink-0 items-center gap-2">
          <Logo className="h-7 w-7 shrink-0" />
          <span className="hidden text-sm font-semibold text-primary-dark sm:inline">{tShell("title")}</span>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          {notificationsSlot}
          <ManagerAreaSwitch />
          <ThemeToggle />
          <button
            onClick={handleSignOut}
            aria-label={tShell("signOut")}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-primary-dark transition-colors hover:bg-surface-alt"
          >
            <LogOut size={15} className="text-text-secondary" />
            <span className="hidden sm:inline">{tShell("signOut")}</span>
          </button>
        </div>
      </header>

      {/* The left nav below is md-and-up; on a phone this strip is the only way between sections. */}
      <nav
        aria-label={tShell("sections")}
        className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-3 py-2 md:hidden"
      >
        {ADMIN_NAV_ITEMS.map((item) => {
          const isActive = isNavItemActive(item, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-1.5 text-[13px] ${
                isActive
                  ? "bg-primary/10 font-semibold text-primary-dark"
                  : "text-text-secondary hover:bg-primary/5 hover:text-primary-dark"
              }`}
            >
              <Icon size={15} />
              {tAdmin(item.label)}
            </Link>
          );
        })}
      </nav>

      <div className="flex min-w-0 flex-1">
        <aside className="hidden w-60 shrink-0 border-r border-border bg-surface px-3 py-4 md:block">
          <nav aria-label={tShell("sections")} className="space-y-1">
            {ADMIN_NAV_ITEMS.map((item) => {
              const isActive = isNavItemActive(item, pathname);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13.5px] ${
                    isActive
                      ? "bg-primary/10 font-semibold text-primary-dark"
                      : "text-text-secondary hover:bg-primary/5 hover:text-primary-dark"
                  }`}
                >
                  <Icon size={16} />
                  {tAdmin(item.label)}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
