import { expect, test } from "@playwright/test";
import { expectSignedInAt, useAdminSession, useOperatorSession, useSalesManagerSession } from "./session";

/**
 * R3/S04: the people directory (/admin/users, "Xodimlar") and one person's page
 * (/admin/users/[email]). Read-only — nothing here adds, re-roles or deactivates
 * anybody; the access panel and the add dialog are only looked at, never
 * submitted (the shared project has no disposable database, docs/TESTING.md).
 *
 * The admin block needs TEST_SESSION_COOKIE and skips itself without it, like
 * every signed-in spec (tests/e2e/session.ts). The person page reads the 0021
 * people functions, so that migration has to be applied to the project the
 * session belongs to. The operator and sales-manager blocks need
 * TEST_OPERATOR_COOKIE / TEST_MANAGER_COOKIE and check the other half: neither
 * role gets either page.
 */

/** A path of somebody who does not have to exist: the redirect happens before
 * the page looks the person up. */
const SOMEONE = "/admin/users/someone%40example.com";

test.describe("people directory and person page (admin session)", () => {
  useAdminSession();

  test("the directory renders its summary, role tabs and controls, with arrow-key tabs", async ({ page }) => {
    await page.goto("/admin/users");
    await expectSignedInAt(page, /\/admin\/users$/);

    await expect(page.getByRole("heading", { level: 1, name: "Xodimlar", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "+ Xodim qo'shish" })).toBeVisible();

    // The summary strip.
    for (const label of ["Jami", "Operatorlar", "Menejerlar", "Nofaol"]) {
      await expect(page.getByRole("term").filter({ hasText: new RegExp(`^${label}$`) })).toBeVisible();
    }
    await expect(page.getByRole("term").filter({ hasText: /^Faol \(7 kun\)$/ })).toBeVisible();

    // Role tabs: a real tablist, "Hammasi" selected first.
    const tablist = page.getByRole("tablist");
    await expect(tablist.getByRole("tab")).toHaveCount(4);
    const all = tablist.getByRole("tab", { name: /^Hammasi/ });
    const operators = tablist.getByRole("tab", { name: /^Operatorlar/ });
    const admin = tablist.getByRole("tab", { name: /^Admin/ });
    await expect(all).toHaveAttribute("aria-selected", "true");

    await all.focus();
    await page.keyboard.press("ArrowRight");
    await expect(operators).toHaveAttribute("aria-selected", "true");
    await expect(operators).toBeFocused();
    // The state is mirrored to the URL without a navigation.
    await expect(page).toHaveURL(/[?&]role=operator(&|$)/);

    await page.keyboard.press("End");
    await expect(admin).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Home");
    await expect(all).toHaveAttribute("aria-selected", "true");
    await expect(page).not.toHaveURL(/role=/);

    // Search, sort and the view toggle.
    await expect(page.getByRole("searchbox", { name: "Ism yoki Gmail bo'yicha qidirish" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Saralash" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Ko'rinish" }).getByRole("button")).toHaveCount(2);
  });

  test("a search that matches nobody says so, and clearing it brings the list back", async ({ page }) => {
    await page.goto("/admin/users");
    await expectSignedInAt(page, /\/admin\/users$/);

    const search = page.getByRole("searchbox", { name: "Ism yoki Gmail bo'yicha qidirish" });
    await search.fill("zzzz-nobody-has-this-name");
    await expect(page.getByText("Mos qator topilmadi")).toBeVisible();
    await expect(page).toHaveURL(/[?&]q=zzzz-nobody-has-this-name/);

    await search.fill("");
    await expect(page.getByText("Mos qator topilmadi")).toBeHidden();
    await expect(page).not.toHaveURL(/q=/);
  });

  test("the table view is the allow-list table, with the email as a link to the person", async ({ page }) => {
    await page.goto("/admin/users?view=table");
    await expectSignedInAt(page, /\/admin\/users\?view=table$/);

    const ownRow = page.getByRole("row").filter({ hasText: "Siz" });
    await expect(ownRow).toHaveCount(1);
    // An admin row: badge, disabled controls (0020) — the same table as before.
    await expect(ownRow.getByRole("combobox")).toBeDisabled();
    await expect(page.getByText("Admin faqat SQL Editor orqali boshqariladi")).toBeVisible();

    const emailLink = ownRow.getByRole("cell").first().getByRole("link");
    await expect(emailLink).toHaveAttribute("href", /\/admin\/users\/.+/);

    // The directory's own controls drive this view: no second search box.
    await expect(page.getByRole("searchbox")).toHaveCount(1);

    await page.getByRole("group", { name: "Ko'rinish" }).getByRole("button", { name: "Kartalar" }).click();
    await expect(page.getByRole("table")).toBeHidden();
    await expect(page).not.toHaveURL(/view=/);
  });

  test("a card opens that person's page — their numbers, charts, timeline and access panel", async ({ page }) => {
    await page.goto("/admin/users");
    await expectSignedInAt(page, /\/admin\/users$/);

    // An operator's or a sales manager's card (the admin's has no numbers).
    const card = page.getByRole("tabpanel").getByRole("link").filter({ hasText: /Operator|Menejer/ }).first();
    test.skip((await card.count()) === 0, "no operator or sales manager on the allow-list yet");

    const href = await card.getAttribute("href");
    await card.click();
    await expect(page).toHaveURL(new RegExp(`${(href ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Xodimlar", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "7 kun", exact: true })).toBeVisible();

    // The eight headline numbers.
    for (const label of [
      "Faol vaqt",
      "Faol kunlar",
      "Sessiyalar",
      "Ko'rilgan materiallar",
      "Nusxalashlar",
      "Qidiruvlar",
      "Copilot savollari",
      "Qo'ng'iroqlar qayd etilgan",
    ]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }

    // Every panel is there — with its data or with its own empty / error state.
    for (const heading of [
      "Kunlik faollik",
      "Qaysi soatlarda ishlaydi",
      "Bo'limlar bo'yicha vaqt",
      "Eng ko'p ko'rilgan materiallar",
      "Topilmagan qidiruvlar",
      "So'nggi harakatlar",
      "Kirish huquqi",
    ]) {
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    }

    // The range picker keeps the person in the path.
    await page.getByRole("link", { name: "30 kun", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/users\/[^?]+\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // The access panel: the role and the sign-in switch, looked at, not used.
    const roleGroup = page.getByRole("group", { name: "Rol", exact: true });
    await expect(roleGroup.getByRole("button")).toHaveCount(2);
    await expect(page.getByRole("switch")).toBeVisible();
  });

  // Not asserted on the HTTP status: loading.tsx has started streaming by the
  // time the page decides, so Next answers 200 with the not-found UI in it.
  test("an email that is not on the allow-list gets the not-found page", async ({ page }) => {
    await page.goto("/admin/users/nobody-at-all%40example.invalid");
    await expect(page.getByText("Sahifa topilmadi")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Kunlik faollik", exact: true })).toHaveCount(0);
  });

  test("a path that is not an email gets the not-found page too", async ({ page }) => {
    await page.goto("/admin/users/not-an-email");
    await expect(page.getByText("Sahifa topilmadi")).toBeVisible();
  });

  test("the admin's own page has no numbers and no controls, only the locked note", async ({ page }) => {
    await page.goto("/admin/users");
    await expectSignedInAt(page, /\/admin\/users$/);

    const adminCard = page.getByRole("tabpanel").getByRole("link").filter({ hasText: "Telemetriya yozilmaydi" }).first();
    await adminCard.click();

    await expect(page.getByText("Telemetriya yozilmaydi", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("Admin faqat SQL Editor orqali boshqariladi")).toBeVisible();
    await expect(page.getByRole("switch")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Kunlik faollik", exact: true })).toHaveCount(0);
  });
});

test.describe("an operator is kept out of the people pages", () => {
  useOperatorSession();

  for (const path of ["/admin/users", SOMEONE]) {
    test(`${path} sends an operator home`, async ({ page }) => {
      await page.goto(path);
      await expect(page, "redirected elsewhere — TEST_OPERATOR_COOKIE is expired or not an operator's").toHaveURL(
        /localhost:\d+\/$/
      );
    });
  }
});

test.describe("a sales manager is kept out of the people pages", () => {
  useSalesManagerSession();

  for (const path of ["/admin/users", SOMEONE]) {
    test(`${path} sends a sales manager home`, async ({ page }) => {
      await page.goto(path);
      await expect(page, "redirected elsewhere — TEST_MANAGER_COOKIE is expired or not a manager's").toHaveURL(
        /localhost:\d+\/$/
      );
    });
  }

  test("the ru person page sends a sales manager to the ru home", async ({ page }) => {
    await page.goto(`/ru${SOMEONE}`);
    await expect(page).toHaveURL(/\/ru$/);
  });
});
