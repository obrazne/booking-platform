import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import { loginPlatformAdmin, service, STROMY } from "./helpers";

// Control center v1.2 (Z28): menu, client detail with tabs, expandable client rows, module catalog, audit filters.

async function noSeriousA11y(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await loginPlatformAdmin(page, ADMIN_URL);
});

test("menu: readable on hover, hierarchy, the client's group and breadcrumbs", async ({
  page,
}, info) => {
  const mobile = info.project.name === "mobile";
  await page.goto(`${ADMIN_URL}/platform/tenants/${STROMY}/theme`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Chalet STRÖMY");
  const crumbs = page.getByRole("navigation", { name: "Drobčeková navigácia" });
  await expect(crumbs).toContainText("Klienti");
  await expect(crumbs.getByText("Vzhľad")).toHaveAttribute("aria-current", "page");

  if (mobile) await page.getByRole("button", { name: "Menu" }).click();
  else await page.locator("aside").hover();
  const menu = page.getByRole("navigation", { name: "Hlavné menu" }).filter({ visible: true });
  await expect(menu.getByRole("button", { name: /^Klienti/ })).toBeVisible();
  await expect(menu.getByRole("button", { name: /^Moduly/ })).toBeVisible();
  // The client's own group is open on its pages, with the current tab marked.
  const group = menu.getByRole("button", { name: /^Chalet STRÖMY/ });
  await expect(group).toHaveAttribute("aria-expanded", "true");
  const current = menu.getByRole("link", { name: "Vzhľad" });
  await expect(current).toHaveAttribute("aria-current", "page");

  // Graphite menu: text stays light on hover (no light background with white text).
  const link = menu.getByRole("link", { name: "Stav systému" });
  await link.hover();
  const { color, bg } = await link.evaluate((el) => {
    const s = getComputedStyle(el);
    return { color: s.color, bg: s.backgroundColor };
  });
  const light = (rgb: string) => {
    const [r, g, b] = rgb.match(/\d+(\.\d+)?/g)!.map(Number);
    return (r! + g! + b!) / 3;
  };
  expect(light(color)).toBeGreaterThan(200);
  expect(bg === "rgba(0, 0, 0, 0)" || light(bg) < 120 || bg.includes("255, 255, 255, 0.")).toBe(
    true,
  );
  await noSeriousA11y(page);
});

test("client list: the row expands with the client at a glance, Otvoriť detail", async ({
  page,
}) => {
  await page.goto(`${ADMIN_URL}/platform`);
  const row = page.getByRole("button", { name: /Chalet STRÖMY/ }).first();
  await expect(row).toHaveAttribute("aria-expanded", "false");
  await row.click();
  await expect(row).toHaveAttribute("aria-expanded", "true");
  const region = page.getByRole("region", { name: "Chalet STRÖMY" });
  await expect(region).toContainText("Tržby priamo tento mesiac");
  await expect(region).toContainText("Obsadenosť 90 dní");
  await expect(region).not.toContainText("booking-platform.test");
  await expect(region).not.toContainText(".localhost");
  await noSeriousA11y(page);
  await region.getByRole("link", { name: "Otvoriť detail" }).click();
  await page.waitForURL(new RegExp(`/platform/tenants/${STROMY}$`));
  // Domény: development address marked, never offered as the client's address.
  await page.getByRole("link", { name: "Domény" }).first().click();
  await expect(page.getByText("len vývoj").first()).toBeVisible();
});

test("modules: catalog row, assign to a client, trials", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  const db = service();
  const slug = `e2e-${Date.now()}`;
  const { data: tenant } = await db
    .from("tenants")
    .insert({ slug, name: `E2E klient ${slug.slice(-4)}`, status: "onboarding" })
    .select("id, name")
    .single();
  try {
    await page.goto(`${ADMIN_URL}/platform/modules`);
    await expect(page.getByText("V príprave").first()).toBeVisible();
    await page
      .getByRole("button", { name: /^Doplnkové služby/ })
      .first()
      .click();
    const form = page.locator("form").filter({ hasText: "Priradiť klientovi" });
    await form.getByRole("combobox", { name: "Klient" }).click();
    await page.getByRole("option", { name: tenant!.name }).click();
    await form.locator('input[name="trialEndsAt"]').fill("2030-01-31");
    await form.getByRole("button", { name: "Priradiť" }).click();
    await expect
      .poll(async () => {
        const { data } = await db
          .from("tenant_modules")
          .select("status, trial_ends_at")
          .eq("tenant_id", tenant!.id)
          .eq("module_key", "services")
          .maybeSingle();
        return data ? `${data.status} ${data.trial_ends_at?.slice(0, 10)}` : null;
      })
      .toBe("trial 2030-01-31");
    await page.goto(`${ADMIN_URL}/platform/modules/trials`);
    await expect(page.getByRole("row", { name: new RegExp(tenant!.name) })).toBeVisible();
    // Every change goes to the audit.
    const { data: audit } = await db
      .from("audit_log")
      .select("id")
      .eq("tenant_id", tenant!.id)
      .eq("action", "module.changed");
    expect(audit?.length ?? 0).toBeGreaterThan(0);
  } finally {
    await db.from("tenants").delete().eq("id", tenant!.id);
  }
});

test("audit: sign-ins recorded, filters, CSV", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  await page.goto(`${ADMIN_URL}/platform/audit`);
  await expect(page.getByRole("heading", { level: 1, name: "Audit" })).toBeVisible();
  await page.getByLabel("Kategória", { exact: true }).selectOption("signin");
  await page.getByRole("button", { name: "Filtrovať" }).click();
  await page.waitForURL(/category=signin/);
  await expect(page.getByText(/Prihlásenie \(odkazom z e-mailu\)/).first()).toBeVisible();

  await page.getByLabel("Kategória", { exact: true }).selectOption("modules");
  await page.getByLabel("Klient", { exact: true }).selectOption(STROMY);
  await page.getByRole("button", { name: "Filtrovať" }).click();
  await page.waitForURL(new RegExp(`tenant=${STROMY}`));
  await expect(page.locator("main li").first()).toContainText("Modul");
  await noSeriousA11y(page);

  const csv = page.getByRole("link", { name: "Export CSV" });
  const href = await csv.getAttribute("href");
  expect(href).toContain("category=modules");
  const body = await page.evaluate(async (u) => (await fetch(u)).text(), href!);
  expect(body.replace(/^﻿/, "").split("\r\n")[0]).toBe("Čas;Klient;Osoba;Udalosť");
  expect(body).toContain("Chalet STRÖMY");
});
