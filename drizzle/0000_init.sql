CREATE TYPE "public"."tasting_status" AS ENUM('draft', 'live', 'revealed');--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tasting_id" uuid NOT NULL,
	"display_name" varchar(30) NOT NULL,
	"session_token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "participants_sessionTokenHash_unique" UNIQUE("session_token_hash")
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wine_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"score" smallint NOT NULL,
	"note" varchar(500),
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"guess" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_wineId_participantId_unique" UNIQUE("wine_id","participant_id"),
	CONSTRAINT "ratings_score_range" CHECK ("ratings"."score" BETWEEN 1 AND 10)
);
--> statement-breakpoint
CREATE TABLE "tastings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"name" varchar(80) NOT NULL,
	"code" text NOT NULL,
	"status" "tasting_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tastings_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "wines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tasting_id" uuid NOT NULL,
	"blind_number" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"producer" varchar(100),
	"grape" varchar(100),
	"region" varchar(100),
	"country" varchar(100),
	"vintage" integer,
	"price" integer,
	"is_open" boolean DEFAULT false NOT NULL,
	CONSTRAINT "wines_tastingId_blindNumber_unique" UNIQUE("tasting_id","blind_number")
);
--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_tasting_id_tastings_id_fk" FOREIGN KEY ("tasting_id") REFERENCES "public"."tastings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_wine_id_wines_id_fk" FOREIGN KEY ("wine_id") REFERENCES "public"."wines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wines" ADD CONSTRAINT "wines_tasting_id_tastings_id_fk" FOREIGN KEY ("tasting_id") REFERENCES "public"."tastings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "participants_tasting_id_display_name_key" ON "participants" USING btree ("tasting_id",lower("display_name"));--> statement-breakpoint
CREATE INDEX "tastings_owner_id_index" ON "tastings" USING btree ("owner_id");