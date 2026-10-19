import type { BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";

// Auth.js namnger sessionscookien så här över http. Namnet är också salt för
// krypteringen.
const SESSION_COOKIE = "authjs.session-token";

// Loggar in utan GitHub genom att lägga en krypterad session i webbläsaren,
// samma sorts cookie som Auth.js själv sätter efter inloggningen.
export async function logInAsAdmin(
  context: BrowserContext,
  ownerId: string,
): Promise<void> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET saknas. Se .env.example.");

  const value = await encode({
    token: { ownerId, name: "E2E-admin" },
    secret,
    salt: SESSION_COOKIE,
  });
  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value,
      url: "http://localhost:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
