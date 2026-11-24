ALTER TABLE "swipes" ADD COLUMN "previous_date" date;--> statement-breakpoint
ALTER TABLE "swipes" ADD COLUMN "previous_start" integer;--> statement-breakpoint
ALTER TABLE "swipes" ADD COLUMN "previous_end" integer;--> statement-breakpoint
ALTER TABLE "swipes" ADD COLUMN "previous_match_id" uuid;