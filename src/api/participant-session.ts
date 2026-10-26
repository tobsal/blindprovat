import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  findParticipantBySessionToken,
  type SessionParticipant,
} from "@/repositories/participants";
import { sessionTokenSchema } from "@/validation/participant";

const SESSION_COOKIE = "participant_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

// All sessionsläsning för deltagare går hit, på samma sätt som
// admin-session gör för admin. Cookien innehåller den råa tokenen och
// databasen bara dess hash.
export async function setParticipantSession(
  sessionToken: string,
): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

// Cookien kommer utifrån och valideras innan den slås upp.
export async function getParticipant(): Promise<SessionParticipant | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  const sessionToken = sessionTokenSchema.safeParse(value);
  if (!sessionToken.success) return null;
  return findParticipantBySessionToken(sessionToken.data);
}

// Varje anrop som läser eller skriver deltagarens data ska börja här. En
// layout skyddar inte server actions.
export async function requireParticipant(): Promise<SessionParticipant> {
  const participant = await getParticipant();
  if (!participant) redirect("/");
  return participant;
}
