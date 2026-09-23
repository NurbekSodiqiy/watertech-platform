import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import ru from "@/messages/ru.json";
import uz from "@/messages/uz.json";
import {
  MANAGER_NAV,
  activeAreaId,
  isNavItemActive,
  managerArea,
  type ManagerNavArea,
  type ManagerNavItem,
} from "@/lib/admin/nav";

const ROOT = path.resolve(__dirname, "../../..");

type Messages = { [key: string]: string | Messages };
const LOCALES: [string, Messages][] = [
  ["uz", uz],
  ["ru", ru],
];

/** Where each area's pages live on disk. */
const AREA_DIR: Record<ManagerNavArea["id"], string> = {
  dashboard: "app/[locale]/dashboard",
  admin: "app/[locale]/(admin)/admin",
};

/** Routes under an area that are deliberately not a nav entry: a row's version
 * history is opened from that row, the notifications inbox from the bell. */
const NOT_IN_NAV: Record<ManagerNavArea["id"], string[]> = {
  dashboard: [],
  admin: ["versions", "notifications"],
};

function hasPath(tree: Messages, dotted: string): boolean {
  let node: string | Messages | undefined = tree;
  for (const key of dotted.split(".")) {
    if (typeof node !== "object") return false;
    node = node[key];
  }
  return typeof node === "string" && node.trim() !== "";
}

function pageFile(area: ManagerNavArea, item: ManagerNavItem): string {
  const rest = item.href.slice(area.href.length).replace(/^\//, "");
  return path.join(ROOT, AREA_DIR[area.id], rest, "page.tsx");
}

/** Whether a page.tsx exists in `dir` or anywhere below it — /admin/versions has
 * none of its own, only versions/[table]/[id]/page.tsx. */
function hasPageBelow(dir: string): boolean {
  return readdirSync(dir, { withFileTypes: true }).some((entry) =>
    entry.isDirectory() ? hasPageBelow(path.join(dir, entry.name)) : entry.name === "page.tsx"
  );
}

const allItems = MANAGER_NAV.flatMap((area) => area.items.map((item) => ({ area, item })));

describe("MANAGER_NAV completeness", () => {
  it("has exactly the dashboard and admin areas, each with its own paths", () => {
    expect(MANAGER_NAV.map((area) => area.id)).toEqual(["dashboard", "admin"]);
    for (const area of MANAGER_NAV) {
      expect(area.items.length).toBeGreaterThan(0);
      for (const { href } of area.items) {
        expect(href === area.href || href.startsWith(`${area.href}/`), `${href} is outside ${area.href}`).toBe(true);
      }
    }
  });

  it("lists every href once, and starts each area at its landing page", () => {
    const hrefs = allItems.map(({ item }) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const area of MANAGER_NAV) {
      expect(area.items[0]?.href).toBe(area.href);
      expect(area.items[0]?.exact).toBe(true);
    }
  });

  it.each(allItems.map(({ area, item }) => [item.href, area, item] as const))(
    "%s has a page on disk",
    (_href, area, item) => {
      expect(existsSync(pageFile(area, item)), pageFile(area, item)).toBe(true);
    }
  );

  it.each(MANAGER_NAV.map((area) => [area.id, area] as const))(
    "every page of the %s area is in the nav or explicitly exempt",
    (_id, area) => {
      const dir = path.join(ROOT, AREA_DIR[area.id]);
      const routes = readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && hasPageBelow(path.join(dir, entry.name)))
        .map((entry) => entry.name);
      const inNav = new Set(area.items.map((item) => item.href.slice(area.href.length).split("/")[1]));
      const missing = routes.filter((route) => !inNav.has(route) && !NOT_IN_NAV[area.id].includes(route));
      expect(missing).toEqual([]);
      // ...and the exemptions are real routes, so the list cannot rot.
      for (const route of NOT_IN_NAV[area.id]) expect(routes).toContain(route);
    }
  );

  describe.each(LOCALES)("messages/%s.json", (_locale, messages) => {
    it("has a label for every item, under the area's namespace", () => {
      for (const area of MANAGER_NAV) {
        for (const item of area.items) {
          const key = `${area.messages}.${item.label}`;
          expect(hasPath(messages, key), key).toBe(true);
        }
      }
    });

    it("has a label for every area in the header switch", () => {
      for (const area of MANAGER_NAV) {
        const key = `chrome.managerNav.areas.${area.id}`;
        expect(hasPath(messages, key), key).toBe(true);
      }
      expect(hasPath(messages, "chrome.managerNav.label")).toBe(true);
    });
  });

  it("is what the shells and the dashboard tabs are built from", () => {
    const read = (file: string): string => readFileSync(path.join(ROOT, file), "utf8");
    expect(read("components/admin/AdminShell.tsx")).toContain('from "@/lib/admin/nav"');
    expect(read("components/dashboard/DashboardTabs.tsx")).toContain('from "@/lib/admin/nav"');
    // Both headers get the Dashboard <-> Admin switch from one component...
    expect(read("components/admin/AdminShell.tsx")).toContain("<ManagerAreaSwitch />");
    expect(read("components/ManagerMonitoringHeader.tsx")).toContain("<ManagerAreaSwitch />");
    // ...which reads the config.
    expect(read("components/admin/ManagerAreaSwitch.tsx")).toContain('from "@/lib/admin/nav"');
  });
});

describe("activeAreaId", () => {
  it("maps a pathname to its area, on whole segments", () => {
    expect(activeAreaId("/dashboard")).toBe("dashboard");
    expect(activeAreaId("/dashboard/copilot")).toBe("dashboard");
    expect(activeAreaId("/admin")).toBe("admin");
    expect(activeAreaId("/admin/versions/content_faqs/faq-1")).toBe("admin");
    expect(activeAreaId("/administrators")).toBeNull();
    expect(activeAreaId("/scripts")).toBeNull();
  });
});

describe("isNavItemActive", () => {
  const admin = managerArea("admin");
  const overview = admin.items[0];
  const packages = admin.items.find((item) => item.href === "/admin/packages");
  if (!overview || !packages) throw new Error("nav fixture items missing");

  it("lights a landing page only on itself", () => {
    expect(isNavItemActive(overview, "/admin")).toBe(true);
    expect(isNavItemActive(overview, "/admin/faq")).toBe(false);
  });

  it("lights a section on its own pages, including nested ones", () => {
    expect(isNavItemActive(packages, "/admin/packages")).toBe(true);
    expect(isNavItemActive(packages, "/admin/packages/groups")).toBe(true);
    expect(isNavItemActive(packages, "/admin/packages/pkg-1")).toBe(true);
  });

  it("matches whole segments only", () => {
    expect(isNavItemActive(packages, "/admin/packagesx")).toBe(false);
    expect(isNavItemActive(packages, "/admin/products")).toBe(false);
  });

  it("gives the dashboard's four tabs distinct active states", () => {
    const tabs = managerArea("dashboard").items;
    expect(tabs.map((tab) => tab.href)).toEqual([
      "/dashboard",
      "/dashboard/content",
      "/dashboard/quality",
      "/dashboard/copilot",
    ]);
    for (const tab of tabs) {
      expect(tabs.filter((other) => isNavItemActive(other, tab.href)).map((other) => other.href)).toEqual([tab.href]);
    }
  });
});
