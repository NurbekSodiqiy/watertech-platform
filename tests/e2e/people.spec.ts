import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectSignedInAt, useAdminSession, useOperatorSession, useSalesManagerSession } from "./session";

/**
 * R3/S04: the people directory (/admin/users, "Xodimlar") and one person's page
 * (/admin/users/[email]). Read-only — nothing here adds, re-roles, deactivates
 * or removes anybody; the access panel, the add dialog and the remove dialog
 * (0022) are only opened and cancelled, never submitted (the shared project
 * has no disposable database, docs/TESTING.md).
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

const REMOVE_TITLE = "Xodimni o'chirish";

/** The remove dialog, opened on `email`: nothing on it is pre-filled, the
 * history purge is off, focus is in the confirmation field, and the danger
 * button stays disabled until the typed text is that email (case and spaces
 * aside). Then cancelled — never submitted. */
async function checkRemoveDialog(page: Page, email: string): Promise<void> {
  const dialog = page.getByRole("alertdialog", { name: REMOVE_TITLE });
  await expect(dialog).toBeVisible();

  const confirm = dialog.getByRole("button", { name: REMOVE_TITLE, exact: true });
  const field = dialog.getByRole("textbox", { name: "Tasdiqlash uchun emailni yozing" });
  await expect(field).toBeFocused();
  await expect(field).toHaveValue("");
  await expect(dialog.getByRole("checkbox")).not.toBeChecked();
  await expect(confirm).toBeDisabled();

  await field.fill("somebody-else@example.com");
  await expect(confirm).toBeDisabled();
  await field.fill(email.slice(0, -1));
  await expect(confirm).toBeDisabled();
  await field.fill(`  ${email.toUpperCase()} `);
  await expect(confirm).toBeEnabled();

  await dialog.getByRole("button", { name: "Bekor qilish" }).click();
  await expect(dialog).toBeHidden();
}

/** The email a card or a row links to (/admin/users/<encoded email>). */
async function linkedEmail(link: Locator): Promise<string> {
  const href = (await link.getAttribute("href")) ?? "";
  return decodeURIComponent(href.slice(href.lastIndexOf("/") + 1));
}

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

  test("a card's ⋯ menu offers profile, access and Remove — by keyboard — and the admin's card has none", async ({
    page,
  }) => {
    await page.goto("/admin/users");
    await expectSignedInAt(page, /\/admin\/users$/);

    const panel = page.getByRole("tabpanel");
    // The admin's own card (and any admin's) carries no menu at all.
    const adminCard = panel.getByRole("listitem").filter({ hasText: "Telemetriya yozilmaydi" }).first();
    await expect(adminCard.getByRole("button", { name: / — amallar$/ })).toHaveCount(0);

    const menuButton = panel.getByRole("button", { name: / — amallar$/ }).first();
    test.skip((await menuButton.count()) === 0, "no operator or sales manager on the allow-list yet");
    const card = panel.getByRole("listitem").filter({ has: menuButton });
    const email = await linkedEmail(card.getByRole("link").first());

    // Enter opens on the first item; End / Escape; focus comes back.
    await menuButton.focus();
    await page.keyboard.press("Enter");
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem")).toHaveCount(3);
    await expect(menu.getByRole("menuitem", { name: "Profilni ochish" })).toBeFocused();
    await expect(menu.getByRole("menuitem", { name: /^(To'xtatish|Tiklash)$/ })).toBeVisible();
    await page.keyboard.press("End");
    await expect(menu.getByRole("menuitem", { name: "O'chirish" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(menuButton).toBeFocused();

    // ArrowUp opens on the last item — Remove — and Enter chooses it.
    await page.keyboard.press("ArrowUp");
    await expect(page.getByRole("menu").getByRole("menuitem", { name: "O'chirish" })).toBeFocused();
    await page.keyboard.press("Enter");
    await checkRemoveDialog(page, email);
    // The dialog gives focus back to the menu button.
    await expect(menuButton).toBeFocused();

    // A click elsewhere closes an open menu.
    await menuButton.click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.getByRole("heading", { level: 1 }).click();
    await expect(page.getByRole("menu")).toHaveCount(0);
  });

  test("the table view offers Remove on operator and manager rows, never on an admin's", async ({ page }) => {
    await page.goto("/admin/users?view=table");
    await expectSignedInAt(page, /\/admin\/users\?view=table$/);

    const ownRow = page.getByRole("row").filter({ hasText: "Siz" });
    await expect(ownRow.getByRole("button", { name: /^O'chirish: / })).toHaveCount(0);

    const removeButtons = page.getByRole("button", { name: /^O'chirish: / });
    const count = await removeButtons.count();
    test.skip(count === 0, "no operator or sales manager on the allow-list yet");
    // Only rows whose role can change here get one: never a locked (admin) row.
    for (let i = 0; i < count; i += 1) {
      const row = page.getByRole("row").filter({ has: removeButtons.nth(i) });
      await expect(row.getByRole("combobox")).toBeEnabled();
    }

    const first = removeButtons.first();
    const email = ((await first.getAttribute("aria-label")) ?? "").replace(/^O'chirish: /, "");
    await first.click();
    await checkRemoveDialog(page, email);
  });

  test("a person's page has a danger zone with Remove; the dialog is not submitted", async ({ page }) => {
    await page.goto("/admin/users");
    await expectSignedInAt(page, /\/admin\/users$/);

    const card = page.getByRole("tabpanel").getByRole("link").filter({ hasText: /Operator|Menejer/ }).first();
    test.skip((await card.count()) === 0, "no operator or sales manager on the allow-list yet");
    const email = await linkedEmail(card);
    await card.click();

    await expect(page.getByRole("heading", { name: "Xavfli hudud", exact: true })).toBeVisible();
    await page.getByRole("button", { name: REMOVE_TITLE, exact: true }).click();
    await checkRemoveDialog(page, email);
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
    // No danger zone either: admin rows are removed in the SQL editor only.
    await expect(page.getByRole("heading", { name: "Xavfli hudud", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: REMOVE_TITLE, exact: true })).toHaveCount(0);
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
