CREATE TYPE "public"."wine_type" AS ENUM('red', 'white', 'rose', 'sparkling');--> statement-breakpoint
ALTER TABLE "ratings" ADD COLUMN "sweetness" smallint;--> statement-breakpoint
ALTER TABLE "ratings" ADD COLUMN "body" smallint;--> statement-breakpoint
ALTER TABLE "ratings" ADD COLUMN "astringency" smallint;--> statement-breakpoint
ALTER TABLE "ratings" ADD COLUMN "acidity" smallint;--> statement-breakpoint
ALTER TABLE "wines" ADD COLUMN "type" "wine_type";--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_sweetness_range" CHECK ("ratings"."sweetness" BETWEEN 1 AND 12);--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_body_range" CHECK ("ratings"."body" BETWEEN 1 AND 12);--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_astringency_range" CHECK ("ratings"."astringency" BETWEEN 1 AND 12);--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_acidity_range" CHECK ("ratings"."acidity" BETWEEN 1 AND 12);