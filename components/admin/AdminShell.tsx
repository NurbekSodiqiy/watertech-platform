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
  Phone,
  ScrollText,
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

/** `pages.admin.<key>.nav` is the label of each entry. */
const ADMIN_NAV: { path: string; key: "overview" | "scripts" | "objections" | "faq" | "competitors" | "packages" | "products"; icon: LucideIcon }[] = [
  { path: "/admin", key: "overview", icon: LayoutDashboard },
  { path: "/admin/scripts", key: "scripts", icon: MessagesSquare },
  { path: "/admin/objections", key: "objections", icon: AlertCircle },
  { path: "/admin/faq", key: "faq", icon: HelpCircle },
  { path: "/admin/competitors", key: "competitors", icon: Users },
  { path: "/admin/packages", key: "packages", icon: Package },
  { path: "/admin/products", key: "products", icon: Boxes },
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
  const tContacts = useTranslations("pages.admin.contacts");
  const tSops = useTranslations("pages.admin.sops");
  const tAdmin = useTranslations("pages.admin");
  const tShell = useTranslations("admin.shell");
  const navEntries: AdminNavEntry[] = [
    ...ADMIN_NAV.map((entry) => ({ path: entry.path, label: tAdmin(`${entry.key}.nav`), icon: entry.icon })),
    { path: "/admin/changelog", label: tChangelog("nav"), icon: Newspaper },
    { path: "/admin/contacts", label: tContacts("nav"), icon: Phone },
    { path: "/admin/sops", label: tSops("nav"), icon: ScrollText },
  ];

  async function handleSignOut() {
    await signOutAndRedirect(router);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur">
        <div className="flex shrink-0 items-center gap-2">
          <Logo className="h-7 w-7 shrink-0" />
          <span className="text-sm font-semibold text-primary-dark">{tShell("title")}</span>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          {notificationsSlot}
          <Link
            href="/dashboard"
            className="rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-primary-dark transition-colors hover:bg-surface-alt"
          >
            {tShell("monitoring")}
          </Link>
          <ThemeToggle />
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-primary-dark transition-colors hover:bg-surface-alt"
          >
            <LogOut size={15} className="text-text-secondary" />
            {tShell("signOut")}
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
