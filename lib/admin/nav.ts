import {
  Activity,
  AlertCircle,
  Bot,
  Boxes,
  FileStack,
  HelpCircle,
  History,
  LayoutDashboard,
  MessagesSquare,
  Newspaper,
  Package,
  Phone,
  ScrollText,
  Star,
  Trash2,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

// The one description of the manager's navigation. Two areas share a header —
// Dashboard (monitoring) and Admin (the content CMS) — and each has its own
// sections: the dashboard's tabs, the admin's left nav. Before this file the
// header link, the tab list and the admin list were spelled out separately in
// ManagerMonitoringHeader, DashboardTabs and AdminShell, and a new page had to
// be remembered in three places. All three read from here now, and
// tests/unit/admin/nav.test.ts checks the config against the pages on disk and
// against both message files.
//
// Client-safe on purpose (icons, strings, pure functions): it is imported by
// Client Components.

export type ManagerAreaId = "dashboard" | "admin";

export interface ManagerNavItem {
  /** Locale-less path, as `usePathname()` from @/i18n/routing reports it. */
  readonly href: string;
  /** Message key inside the area's `messages` namespace. */
  readonly label: string;
  readonly icon: LucideIcon;
  /** Active only on `href` itself, not on the pages below it (a section's
   * landing page would otherwise stay lit on every one of its siblings). */
  readonly exact?: true;
}

export interface ManagerNavArea {
  readonly id: ManagerAreaId;
  readonly href: string;
  readonly icon: LucideIcon;
  /** Namespace of the items' labels. Each consumer opens it with a literal
   * `useTranslations(...)` — tests/unit/i18n/client-messages.test.ts requires
   * one — so this string is what the nav test checks the keys against. */
  readonly messages: "dashboard" | "pages.admin";
  readonly items: readonly ManagerNavItem[];
}

export const MANAGER_NAV: readonly ManagerNavArea[] = [
  {
    id: "dashboard",
    href: "/dashboard",
    icon: Activity,
    messages: "dashboard",
    items: [
      { href: "/dashboard", label: "tabs.activity", icon: Activity, exact: true },
      { href: "/dashboard/content", label: "tabs.content", icon: FileStack },
      { href: "/dashboard/quality", label: "tabs.quality", icon: Star },
      { href: "/dashboard/copilot", label: "tabs.copilot", icon: Bot },
    ],
  },
  {
    id: "admin",
    href: "/admin",
    icon: LayoutDashboard,
    messages: "pages.admin",
    items: [
      { href: "/admin", label: "overview.nav", icon: LayoutDashboard, exact: true },
      { href: "/admin/scripts", label: "scripts.nav", icon: MessagesSquare },
      { href: "/admin/objections", label: "objections.nav", icon: AlertCircle },
      { href: "/admin/faq", label: "faq.nav", icon: HelpCircle },
      { href: "/admin/competitors", label: "competitors.nav", icon: Users },
      { href: "/admin/packages", label: "packages.nav", icon: Package },
      { href: "/admin/products", label: "products.nav", icon: Boxes },
      { href: "/admin/changelog", label: "changelog.nav", icon: Newspaper },
      { href: "/admin/contacts", label: "contacts.nav", icon: Phone },
      { href: "/admin/sops", label: "sops.nav", icon: ScrollText },
      { href: "/admin/activity", label: "activity.nav", icon: History },
      { href: "/admin/trash", label: "trash.nav", icon: Trash2 },
      { href: "/admin/users", label: "users.nav", icon: UserCog },
    ],
  },
];

/** The area's entry in MANAGER_NAV. Throws only if the config itself is
 * missing an id, which the nav test rules out. */
export function managerArea(id: ManagerAreaId): ManagerNavArea {
  const area = MANAGER_NAV.find((entry) => entry.id === id);
  if (!area) throw new Error(`MANAGER_NAV has no "${id}" area`);
  return area;
}

/** Which area a locale-less pathname belongs to, or null outside both. */
export function activeAreaId(pathname: string): ManagerAreaId | null {
  const area = MANAGER_NAV.find((entry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`));
  return area?.id ?? null;
}

/** Whether `item` is the current page — or, unless it is `exact`, a section
 * the current page sits inside. Matches on whole path segments, so
 * "/admin/faq" does not light up for "/admin/faqs". */
export function isNavItemActive(item: ManagerNavItem, pathname: string): boolean {
  if (pathname === item.href) return true;
  return item.exact !== true && pathname.startsWith(`${item.href}/`);
}
