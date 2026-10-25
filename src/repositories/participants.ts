import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { canJoinTasting } from "@/domain/tasting";
import { db } from "./db";
import { isUniqueViolation, withSafeErrors } from "./errors";
import { constraintNames, participants, tastings } from "./schema";

export type SessionParticipant = {
  id: string;
  tastingId: string;
  displayName: string;
};

export type JoinTastingResult =
  | { ok: true; participant: SessionParticipant; sessionToken: string }
  | { ok: false; error: "not_found" | "name_taken" };

const SESSION_TOKEN_BYTES = 32;

function hashSessionToken(sessionToken: string): string {
  return createHash("sha256").update(sessionToken).digest("hex");
}

const participantColumns = {
  id: participants.id,
  tastingId: participants.tastingId,
  displayName: participants.displayName,
};

// Rå token returneras bara här. Databasen lagrar bara hashen.
export async function joinTasting(input: {
  code: string;
  displayName: string;
}): Promise<JoinTastingResult> {
  const sessionToken = randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
  return withSafeErrors("joinTasting", async () => {
    try {
      return await db.transaction(async (tx) => {
        // Delat lås, så att provningen inte kan avslöjas mellan kontrollen och
        // skrivningen men flera deltagare kan gå med samtidigt (låsregeln står
        // i wines.ts).
        const [tasting] = await tx
          .select({ id: tastings.id, status: tastings.status })
          .from(tastings)
          .where(eq(tastings.code, input.code))
          .for("share");
        // En avslöjad provning ger samma svar som en som inte finns.
        if (!tasting || !canJoinTasting(tasting.status)) {
          return { ok: false, error: "not_found" } as const;
        }

        const [participant] = await tx
          .insert(participants)
          .values({
            tastingId: tasting.id,
            displayName: input.displayName,
            sessionTokenHash: hashSessionToken(sessionToken),
          })
          .returning(participantColumns);
        return { ok: true, participant, sessionToken } as const;
      });
    } catch (error) {
      if (
        isUniqueViolation(error, constraintNames.participantDisplayNameUnique)
      ) {
        return { ok: false, error: "name_taken" } as const;
      }
      throw error;
    }
  });
}

export async function findParticipantBySessionToken(
  sessionToken: string,
): Promise<SessionParticipant | null> {
  return withSafeErrors("findParticipantBySessionToken", async () => {
    const [participant] = await db
      .select(participantColumns)
      .from(participants)
      .where(eq(participants.sessionTokenHash, hashSessionToken(sessionToken)));
    return participant ?? null;
  });
}
