import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { PARTICIPANT_NAME_MAX } from "@/domain/participant";
import {
  GUESS_MAX,
  NOTE_MAX,
  SCORE_MAX,
  SCORE_MIN,
  type RatingTag,
} from "@/domain/rating";
import { TASTING_NAME_MAX, TASTING_STATUSES } from "@/domain/tasting";
import { WINE_DETAIL_MAX, WINE_NAME_MAX } from "@/domain/wine";

export const tastingStatus = pgEnum("tasting_status", TASTING_STATUSES);

// Namn på constraints som koden känner igen i databasfel (isUniqueViolation).
// De namnges här så att de inte beror på vad Drizzle genererar.
export const constraintNames = {
  tastingCodeUnique: "tastings_code_key",
  participantDisplayNameUnique: "participants_tasting_id_display_name_key",
} as const;

export const tastings = pgTable(
  "tastings",
  {
    id: uuid().primaryKey().defaultRandom(),
    // Auth.js-användarens id.
    ownerId: text().notNull(),
    name: varchar({ length: TASTING_NAME_MAX }).notNull(),
    code: text().notNull(),
    status: tastingStatus().notNull().default("draft"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index().on(table.ownerId),
    unique(constraintNames.tastingCodeUnique).on(table.code),
  ],
);

export const wines = pgTable(
  "wines",
  {
    id: uuid().primaryKey().defaultRandom(),
    tastingId: uuid()
      .notNull()
      .references(() => tastings.id, { onDelete: "cascade" }),
    blindNumber: integer().notNull(),
    name: varchar({ length: WINE_NAME_MAX }).notNull(),
    producer: varchar({ length: WINE_DETAIL_MAX }),
    grape: varchar({ length: WINE_DETAIL_MAX }),
    region: varchar({ length: WINE_DETAIL_MAX }),
    country: varchar({ length: WINE_DETAIL_MAX }),
    // null betyder årgångslöst (NV).
    vintage: integer(),
    // Pris i hela kronor.
    price: integer(),
    isOpen: boolean().notNull().default(false),
  },
  (table) => [unique().on(table.tastingId, table.blindNumber)],
);

export const participants = pgTable(
  "participants",
  {
    id: uuid().primaryKey().defaultRandom(),
    tastingId: uuid()
      .notNull()
      .references(() => tastings.id, { onDelete: "cascade" }),
    displayName: varchar({ length: PARTICIPANT_NAME_MAX }).notNull(),
    // Bara hashen lagras, så en databasläcka ger inga giltiga sessioner.
    sessionTokenHash: text().notNull().unique(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex(constraintNames.participantDisplayNameUnique).on(
      table.tastingId,
      sql`lower(${table.displayName})`,
    ),
  ],
);

export const ratings = pgTable(
  "ratings",
  {
    id: uuid().primaryKey().defaultRandom(),
    wineId: uuid()
      .notNull()
      .references(() => wines.id, { onDelete: "cascade" }),
    participantId: uuid()
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    score: smallint().notNull(),
    note: varchar({ length: NOTE_MAX }),
    tags: text()
      .array()
      .$type<RatingTag[]>()
      .notNull()
      .default(sql`'{}'::text[]`),
    guess: varchar({ length: GUESS_MAX }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique().on(table.wineId, table.participantId),
    index("ratings_participant_id_index").on(table.participantId),
    // Konstanterna skrivs in som literaler, en CHECK kan inte ha parametrar.
    check(
      "ratings_score_range",
      sql`${table.score} BETWEEN ${sql.raw(String(SCORE_MIN))} AND ${sql.raw(String(SCORE_MAX))}`,
    ),
  ],
);
