import { expect, test } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import { loginOwner, markToursSeen, service, TENANT } from "./helpers";

// Rezervácie (Z73, linka B): newest first by default — the order of the numbers by the time of creation; by arrival
// on a click on Termín. Only reads.

test("reservations: newest first by default, by arrival on a click", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "the list's header is the same on the phone");
  const db = service();
  const { data: newest } = await db
    .from("reservations")
    .select("number, items:reservation_items!inner(check_in)")
    .eq("tenant_id", TENANT)
    .order("created_at", { ascending: false })
    .order("number", { ascending: false })
    .limit(2);
  test.skip((newest ?? []).length < 2, "needs two reservations");

  await markToursSeen("qa@booking-platform.test");
  await loginOwner(page, ADMIN_URL);
  await page.goto(`${ADMIN_URL}/admin/reservations`);
  const table = page.getByRole("table", { name: "Rezervácie" });
  const firstRow = table.getByRole("row").nth(1);
  await expect(firstRow.getByRole("cell").first()).toHaveText(newest![0]!.number);
  await expect(table.getByRole("row").nth(2).getByRole("cell").first()).toHaveText(
    newest![1]!.number,
  );

  // A click on Číslo turns the order (oldest first); on Termín the arrival decides.
  await table.getByRole("button", { name: "Číslo" }).click();
  await page.waitForURL(/sort=created_at&dir=asc/);
  await table.getByRole("button", { name: "Termín" }).click();
  await page.waitForURL(/sort=arrival_order&dir=asc/);
});
