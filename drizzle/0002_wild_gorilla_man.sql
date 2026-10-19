ALTER TABLE "tastings" DROP CONSTRAINT "tastings_code_unique";--> statement-breakpoint
ALTER TABLE "tastings" ADD CONSTRAINT "tastings_code_key" UNIQUE("code");