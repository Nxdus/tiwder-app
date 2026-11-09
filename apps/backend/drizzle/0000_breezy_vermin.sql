CREATE TYPE "public"."interest_status" AS ENUM('pending', 'proposed', 'rejected', 'withdrawn', 'closed', 'confirmed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('confirmed', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('student', 'tutor');--> statement-breakpoint
CREATE TYPE "public"."skill_level" AS ENUM('Beginner', 'Intermediate', 'Advanced');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "interest_status" DEFAULT 'pending' NOT NULL,
	"student_id" uuid NOT NULL,
	"tutor_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"student_name" text NOT NULL,
	"tutor_name" text NOT NULL,
	"subject_name" text NOT NULL,
	"skill_level" "skill_level" NOT NULL,
	"hourly_rate" integer NOT NULL,
	"date" date,
	"start" integer,
	"end" integer
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interest_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"tutor_id" uuid NOT NULL,
	"time_slot_id" uuid NOT NULL,
	"status" "match_status" DEFAULT 'confirmed' NOT NULL,
	CONSTRAINT "matches_interest_id_unique" UNIQUE("interest_id"),
	CONSTRAINT "matches_time_slot_id_unique" UNIQUE("time_slot_id")
);
--> statement-breakpoint
CREATE TABLE "oauth_transactions" (
	"state" text PRIMARY KEY NOT NULL,
	"browser_hash" text NOT NULL,
	"verifier" text NOT NULL,
	"nonce" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"csrf" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subject_categories" (
	"subject_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "subject_categories_subject_id_category_id_pk" PRIMARY KEY("subject_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "subjects_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "teachings" (
	"tutor_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"skill_level" "skill_level" NOT NULL,
	CONSTRAINT "teachings_tutor_id_subject_id_pk" PRIMARY KEY("tutor_id","subject_id")
);
--> statement-breakpoint
CREATE TABLE "time_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"start" integer NOT NULL,
	"end" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_sub" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"avatar_url" text,
	"role" "role",
	"onboarded" boolean DEFAULT false NOT NULL,
	"phone" text,
	"bio" text,
	"grade_level" text,
	"education" text,
	"experience_years" integer,
	"hourly_rate" integer,
	CONSTRAINT "users_google_sub_unique" UNIQUE("google_sub")
);
--> statement-breakpoint
ALTER TABLE "interests" ADD CONSTRAINT "interests_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interests" ADD CONSTRAINT "interests_tutor_id_users_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interests" ADD CONSTRAINT "interests_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_interest_id_interests_id_fk" FOREIGN KEY ("interest_id") REFERENCES "public"."interests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_tutor_id_users_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_time_slot_id_time_slots_id_fk" FOREIGN KEY ("time_slot_id") REFERENCES "public"."time_slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_categories" ADD CONSTRAINT "subject_categories_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_categories" ADD CONSTRAINT "subject_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teachings" ADD CONSTRAINT "teachings_tutor_id_users_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teachings" ADD CONSTRAINT "teachings_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "one_open_interest" ON "interests" USING btree ("student_id","tutor_id","subject_id") WHERE status in ('pending','proposed');--> statement-breakpoint
CREATE UNIQUE INDEX "active_student" ON "matches" USING btree ("student_id") WHERE status='confirmed';--> statement-breakpoint
CREATE UNIQUE INDEX "active_tutor" ON "matches" USING btree ("tutor_id") WHERE status='confirmed';