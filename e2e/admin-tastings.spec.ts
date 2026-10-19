import { expect, test } from "@playwright/test";
import { createTestOwners } from "@/test-support/fixtures";
import { logInAsAdmin } from "./auth";

const owners = createTestOwners();
test.afterAll(() => owners.cleanUp());

test("utloggad besökare skickas till inloggningen", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Logga in" })).toBeVisible();
});

test("admin skapar en provning och ser den i listan", async ({
  context,
  page,
}) => {
  await logInAsAdmin(context, owners.createOwnerId());
  await page.goto("/admin");
  await expect(page.getByText("Du har inga provningar än.")).toBeVisible();

  await page.getByRole("link", { name: "Ny provning" }).click();
  await page.getByLabel("Namn på provningen").fill("E2E-provning");
  await page.getByRole("button", { name: "Skapa provning" }).click();

  await expect(
    page.getByRole("heading", { name: "E2E-provning" }),
  ).toBeVisible();
  await expect(page.getByTestId("tasting-code")).toHaveText(/^[A-Z2-9]{10}$/);
  await expect(page.getByText("Status: Förbereds")).toBeVisible();

  await page.getByLabel("Namn", { exact: true }).fill("Barolo");
  await page.getByLabel("Producent (valfritt)").fill("Vietti");
  await page.getByLabel("Årgång (valfritt)").fill("2019");
  await page.getByRole("button", { name: "Lägg till vin" }).click();
  await expect(page.getByRole("status")).toHaveText("Vin 1 är tillagt.");
  await expect(page.getByRole("listitem")).toHaveText(
    "Vin 1 – Barolo, Vietti, 2019",
  );
  await expect(page.getByLabel("Namn", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Namn", { exact: true })).toHaveValue("");

  await page.getByLabel("Namn", { exact: true }).fill("Chianti");
  await page.getByRole("button", { name: "Lägg till vin" }).click();
  await expect(page.getByRole("listitem")).toHaveText([
    "Vin 1 – Barolo, Vietti, 2019",
    "Vin 2 – Chianti, Årgångslöst",
  ]);

  await page.getByRole("link", { name: "Till dina provningar" }).click();
  await expect(page.getByRole("link", { name: /E2E-provning/ })).toBeVisible();
});

test("tomt namn ger ett fel vid fältet", async ({ context, page }) => {
  await logInAsAdmin(context, owners.createOwnerId());
  await page.goto("/admin/tastings/new");
  await page.getByRole("button", { name: "Skapa provning" }).click();

  const nameField = page.getByLabel("Namn på provningen");
  await expect(nameField).toHaveAttribute("aria-invalid", "true");
  await expect(nameField).toHaveAccessibleDescription(
    "Fel: Ange provningens namn",
  );
});

test("ogiltig årgång ger fel och behåller det som skrivits", async ({
  context,
  page,
}) => {
  await logInAsAdmin(context, owners.createOwnerId());
  await page.goto("/admin/tastings/new");
  await page.getByLabel("Namn på provningen").fill("Felprovning");
  await page.getByRole("button", { name: "Skapa provning" }).click();

  await page.getByLabel("Namn", { exact: true }).fill("Barolo");
  await page.getByLabel("Årgång (valfritt)").fill("1899");
  await page.getByRole("button", { name: "Lägg till vin" }).click();

  const vintageField = page.getByLabel("Årgång (valfritt)");
  await expect(vintageField).toBeFocused();
  await expect(vintageField).toHaveAccessibleDescription(
    "Lämna tomt om vinet är årgångslöst. Fel: Årgången måste vara mellan 1900 och i år",
  );
  await expect(vintageField).toHaveValue("1899");
  await expect(page.getByLabel("Namn", { exact: true })).toHaveValue("Barolo");
  await expect(page.getByText("Inga viner tillagda än.")).toBeVisible();
});

test("okänd eller ogiltig provning ger samma sida", async ({
  context,
  page,
}) => {
  await logInAsAdmin(context, owners.createOwnerId());
  for (const id of ["6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b", "abc"]) {
    await page.goto(`/admin/tastings/${id}`);
    await expect(
      page.getByRole("heading", { name: "Provningen finns inte" }),
    ).toBeVisible();
  }
});
