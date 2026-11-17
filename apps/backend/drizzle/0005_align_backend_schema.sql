DO $$ BEGIN
  IF to_regclass('public.interests') IS NOT NULL AND to_regclass('public.swipes') IS NULL THEN
    ALTER TABLE "interests" RENAME TO "swipes";
  END IF;
  IF to_regclass('public.subject_categories') IS NOT NULL AND to_regclass('public.contains') IS NULL THEN
    ALTER TABLE "subject_categories" RENAME TO "contains";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.swipes'::regclass AND conname = 'interests_pkey') THEN
    ALTER TABLE "swipes" RENAME CONSTRAINT "interests_pkey" TO "swipes_pkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.swipes'::regclass AND conname = 'interests_student_id_users_id_fk') THEN
    ALTER TABLE "swipes" RENAME CONSTRAINT "interests_student_id_users_id_fk" TO "swipes_student_id_users_id_fk";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.swipes'::regclass AND conname = 'interests_tutor_id_users_id_fk') THEN
    ALTER TABLE "swipes" RENAME CONSTRAINT "interests_tutor_id_users_id_fk" TO "swipes_tutor_id_users_id_fk";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.swipes'::regclass AND conname = 'interests_subject_id_subjects_id_fk') THEN
    ALTER TABLE "swipes" RENAME CONSTRAINT "interests_subject_id_subjects_id_fk" TO "swipes_subject_id_subjects_id_fk";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.matches'::regclass AND conname = 'matches_interest_id_interests_id_fk') THEN
    ALTER TABLE "matches" RENAME CONSTRAINT "matches_interest_id_interests_id_fk" TO "matches_interest_id_swipes_id_fk";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.contains'::regclass AND conname = 'subject_categories_subject_id_subjects_id_fk') THEN
    ALTER TABLE "contains" RENAME CONSTRAINT "subject_categories_subject_id_subjects_id_fk" TO "contains_subject_id_subjects_id_fk";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.contains'::regclass AND conname = 'subject_categories_category_id_categories_id_fk') THEN
    ALTER TABLE "contains" RENAME CONSTRAINT "subject_categories_category_id_categories_id_fk" TO "contains_category_id_categories_id_fk";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.contains'::regclass AND conname = 'subject_categories_subject_id_category_id_pk') THEN
    ALTER TABLE "contains" RENAME CONSTRAINT "subject_categories_subject_id_category_id_pk" TO "contains_subject_id_category_id_pk";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'time_slot_status' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE "public"."time_slot_status" AS ENUM('available', 'booked', 'cancelled');
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "time_slots" ADD COLUMN IF NOT EXISTS "slot_status" "time_slot_status" DEFAULT 'available' NOT NULL;--> statement-breakpoint
UPDATE "time_slots" AS slots
SET "slot_status" = CASE
  WHEN matches.status = 'cancelled' THEN 'cancelled'::"time_slot_status"
  ELSE 'booked'::"time_slot_status"
END
FROM "matches" AS matches
WHERE matches.time_slot_id = slots.id;