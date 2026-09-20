"use client";

import type { ReactNode } from "react";
import { Link } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/routing";
import {
  AlertCircle,
  Boxes,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  Newspaper,
  Package,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { signOutAndRedirect } from "@/lib/auth/sign-out";

interface AdminNavEntry {
  path: string;
  label: string;
  icon: LucideIcon;
}

const ADMIN_NAV: AdminNavEntry[] = [
  { path: "/admin", label: "Umumiy", icon: LayoutDashboard },
  { path: "/admin/scripts", label: "Skriptlar", icon: MessagesSquare },
  { path: "/admin/objections", label: "E'tirozlar", icon: AlertCircle },
  { path: "/admin/faq", label: "FAQ", icon: HelpCircle },
  { path: "/admin/competitors", label: "Raqobatchilar", icon: Users },
  { path: "/admin/packages", label: "Paketlar", icon: Package },
  { path: "/admin/products", label: "Mahsulotlar", icon: Boxes },
];

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
  const router = useRouter();
  const tChangelog = useTranslations("pages.admin.changelog");
  // The one entry whose label comes from messages (the rest predate next-intl
  // in the admin shell and stay as they are).
  const navEntries: AdminNavEntry[] = [
    ...ADMIN_NAV,
    { path: "/admin/changelog", label: tChangelog("nav"), icon: Newspaper },
  ];

  async function handleSignOut() {
    await signOutAndRedirect(router);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur">
        <div className="flex shrink-0 items-center gap-2">
          <Logo className="h-7 w-7 shrink-0" />
          <span className="text-sm font-semibold text-primary-dark">Kontent boshqaruvi</span>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          {notificationsSlot}
          <Link
            href="/dashboard"
            className="rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-primary-dark transition-colors hover:bg-surface-alt"
          >
            Monitoring
          </Link>
          <ThemeToggle />
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-primary-dark transition-colors hover:bg-surface-alt"
          >
            <LogOut size={15} className="text-text-secondary" />
            Chiqish
          </button>
        </div>
      </header>

      <div className="flex min-w-0 flex-1">
        <aside className="hidden w-60 shrink-0 border-r border-border bg-surface px-3 py-4 md:block">
          <nav className="space-y-1">
            {navEntries.map((entry) => {
              const isActive = entry.path === "/admin" ? pathname === "/admin" : pathname.startsWith(entry.path);
              const Icon = entry.icon;
              return (
                <Link
                  key={entry.path}
                  href={entry.path}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13.5px] ${
                    isActive
                      ? "bg-primary/10 font-semibold text-primary-dark"
                      : "text-text-secondary hover:bg-primary/5 hover:text-primary-dark"
                  }`}
                >
                  <Icon size={16} />
                  {entry.label}
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
