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
  await page.getByLabel("Rött", { exact: true }).check();
  await page.getByRole("button", { name: "Lägg till vin" }).click();
  await expect(
    page.getByRole("form", { name: "Lägg till vin" }).getByRole("status"),
  ).toHaveText("Vin 1 är tillagt.");
  await expect(page.getByRole("listitem")).toHaveText(
    "Vin 1 – Barolo, Vietti, 2019",
  );
  await expect(page.getByLabel("Namn", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Namn", { exact: true })).toHaveValue("");

  await page.getByLabel("Namn", { exact: true }).fill("Chianti");
  await page.getByLabel("Rött", { exact: true }).check();
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
  await expect(nameField).toBeFocused();
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
  await page.getByLabel("Rött", { exact: true }).check();
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

test("vin utan vintyp ger ett fel vid vintypen", async ({
  context,
  page,
}) => {
  await logInAsAdmin(context, owners.createOwnerId());
  await page.goto("/admin/tastings/new");
  await page.getByLabel("Namn på provningen").fill("Vintypsprovning");
  await page.getByRole("button", { name: "Skapa provning" }).click();

  await page.getByLabel("Namn", { exact: true }).fill("Barolo");
  await page.getByRole("button", { name: "Lägg till vin" }).click();

  await expect(
    page.getByRole("group", { name: "Vintyp" }),
  ).toHaveAccessibleDescription("Fel: Välj vintyp");
  await expect(page.getByLabel("Rött", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Namn", { exact: true })).toHaveValue("Barolo");
  await expect(page.getByText("Inga viner tillagda än.")).toBeVisible();
});

test("utan uppkoppling finns inmatningen kvar och går att skicka igen", async ({
  context,
  page,
}) => {
  await logInAsAdmin(context, owners.createOwnerId());
  await page.goto("/admin/tastings/new");
  await page.getByLabel("Namn på provningen").fill("Offlineprovning");
  await page.getByRole("button", { name: "Skapa provning" }).click();

  await page.getByLabel("Namn", { exact: true }).fill("Barolo");
  await page.getByLabel("Producent (valfritt)").fill("Vietti");
  await context.setOffline(true);
  await page.getByLabel("Rött", { exact: true }).check();
  await page.getByRole("button", { name: "Lägg till vin" }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "Ingen uppkoppling" }),
  ).toBeVisible();
  await expect(page.getByLabel("Namn", { exact: true })).toHaveValue("Barolo");
  await expect(page.getByLabel("Producent (valfritt)")).toHaveValue("Vietti");

  await expect(page.getByLabel("Rött", { exact: true })).toBeChecked();
  await context.setOffline(false);
  await page.getByRole("button", { name: "Lägg till vin" }).click();
  await expect(
    page.getByRole("form", { name: "Lägg till vin" }).getByRole("status"),
  ).toHaveText("Vin 1 är tillagt.");
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

test("admin startar och avslutar provningen", async ({ context, page }) => {
  await logInAsAdmin(context, owners.createOwnerId());
  await page.goto("/admin/tastings/new");
  await page.getByLabel("Namn på provningen").fill("Statusprovning");
  await page.getByRole("button", { name: "Skapa provning" }).click();

  const start = page.getByRole("button", { name: "Starta provningen" });
  await expect(start).toBeDisabled();
  await expect(start).toHaveAccessibleDescription(
    "Lägg till minst ett vin innan du startar.",
  );

  await page.getByLabel("Namn", { exact: true }).fill("Barolo");
  await page.getByLabel("Rött", { exact: true }).check();
  await page.getByRole("button", { name: "Lägg till vin" }).click();
  await expect(page.getByRole("listitem")).toHaveCount(1);

  await start.click();
  await expect(page.getByText("Status: Pågår")).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Provningen har startat." }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Lägg till vin" })).toHaveCount(
    0,
  );

  const reveal = page.getByRole("button", { name: "Avsluta och avslöja" });
  await expect(reveal).toBeFocused();
  await reveal.click();
  await page.getByRole("button", { name: "Avbryt" }).click();
  await expect(reveal).toBeFocused();
  await expect(page.getByText("Status: Pågår")).toBeVisible();

  await reveal.click();
  await expect(page.getByText(/Deltagarna får se vinerna/)).toBeFocused();
  await page.getByRole("button", { name: "Ja, avsluta" }).click();
  await expect(page.getByText("Status: Avslöjad")).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "vinerna är avslöjade" }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: /Starta|Avsluta/ }),
  ).toHaveCount(0);
});

test("admin öppnar och stänger viner och deltagaren ser det utan omladdning", async ({
  browser,
  context,
  page,
}) => {
  await logInAsAdmin(context, owners.createOwnerId());
  await page.goto("/admin/tastings/new");
  await page.getByLabel("Namn på provningen").fill("Öppna och stäng");
  await page.getByRole("button", { name: "Skapa provning" }).click();
  for (const name of ["Barolo", "Chianti"]) {
    await page.getByLabel("Namn", { exact: true }).fill(name);
    await page.getByLabel("Rött", { exact: true }).check();
    await page.getByRole("button", { name: "Lägg till vin" }).click();
    await expect(page.getByRole("listitem").getByText(name)).toBeVisible();
  }
  const code = await page.getByTestId("tasting-code").innerText();
  await page.getByRole("button", { name: "Starta provningen" }).click();

  const participantContext = await browser.newContext();
  const participant = await participantContext.newPage();
  await participant.goto("/");
  await participant.getByLabel("Provningskod").fill(code);
  await participant.getByLabel("Ditt namn").fill("Lisa");
  await participant.getByRole("button", { name: "Gå med" }).click();
  const firstWine = participant.getByRole("listitem").nth(0);
  await expect(firstWine).toContainText("Inte öppet");

  const firstRow = page.getByRole("listitem").nth(0);
  await expect(firstRow).toContainText("Stängt");
  const open = page.getByRole("button", { name: "Öppna Vin 1" });
  await open.click();
  await expect(firstRow.getByRole("status")).toHaveText(
    "Vin 1 är öppet för betyg.",
  );
  await expect(firstRow).toContainText("Öppet för betyg");
  await expect(page.getByRole("listitem").nth(1)).toContainText("Stängt");
  const close = page.getByRole("button", { name: "Stäng Vin 1" });
  await expect(close).toBeFocused();

  await expect(firstWine).toContainText("Öppet · inte betygsatt än", {
    timeout: 10_000,
  });

  await close.click();
  await expect(firstRow.getByRole("status")).toHaveText(
    "Vin 1 är stängt för betyg.",
  );
  await expect(firstRow).toContainText("Stängt");
  await expect(firstWine).toContainText("Inte öppet", { timeout: 10_000 });

  await participantContext.close();
});

test("admin tar bort en provning efter bekräftelse", async ({
  context,
  page,
}) => {
  await logInAsAdmin(context, owners.createOwnerId());
  await page.goto("/admin/tastings/new");
  await page.getByLabel("Namn på provningen").fill("Borttagningsprovning");
  await page.getByRole("button", { name: "Skapa provning" }).click();

  const deleteButton = page.getByRole("button", { name: "Ta bort provningen" });
  const dialog = page.getByRole("dialog", { name: "Ta bort provningen?" });

  await deleteButton.click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleDescription(/Det går inte att ångra/);
  await expect(dialog.getByRole("button", { name: "Avbryt" })).toBeFocused();
  await dialog.getByRole("button", { name: "Avbryt" }).click();
  await expect(dialog).toBeHidden();
  await expect(deleteButton).toBeFocused();

  await deleteButton.click();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Borttagningsprovning" }),
  ).toBeVisible();

  await deleteButton.click();
  await dialog.getByRole("button", { name: "Ja, ta bort" }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText("Du har inga provningar än.")).toBeVisible();
});
