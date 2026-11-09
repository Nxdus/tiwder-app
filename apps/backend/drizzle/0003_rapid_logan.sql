CREATE TABLE "students" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"bio" text NOT NULL,
	"grade_level" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutors" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"bio" text NOT NULL,
	"education" text NOT NULL,
	"experience_years" integer NOT NULL,
	"hourly_rate" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
INSERT INTO "students" (user_id, phone, bio, grade_level)
SELECT id, phone, bio, grade_level FROM users WHERE role = 'student';
--> statement-breakpoint
INSERT INTO "tutors" (user_id, phone, bio, education, experience_years, hourly_rate)
SELECT id, phone, bio, education, experience_years, hourly_rate FROM users WHERE role = 'tutor';
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "interests" ADD COLUMN "swiped_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "interests" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "matched_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "time_slots" ADD COLUMN "tutor_id" uuid;
--> statement-breakpoint
UPDATE "time_slots" s SET tutor_id = m.tutor_id FROM matches m WHERE m.time_slot_id = s.id;
--> statement-breakpoint
ALTER TABLE "time_slots" ALTER COLUMN "tutor_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutors" ADD CONSTRAINT "tutors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_slots" ADD CONSTRAINT "time_slots_tutor_id_tutors_user_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "phone";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "bio";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "grade_level";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "education";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "experience_years";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "hourly_rate";
--> statement-breakpoint
UPDATE categories SET description = CASE name
WHEN 'Computer Science' THEN 'Programming, software, and computing fundamentals.'
WHEN 'Mathematics' THEN 'Mathematical concepts and problem solving.'
WHEN 'Physics' THEN 'The principles of matter, motion, and energy.'
WHEN 'Languages' THEN 'Language communication and writing skills.' ELSE name END;
--> statement-breakpoint
UPDATE subjects SET description = CASE name
WHEN 'Python Programming' THEN 'Learn Python syntax, programming concepts, and practical projects.'
WHEN 'Web Development' THEN 'Build websites using modern web technologies.'
WHEN 'Calculus' THEN 'Study limits, derivatives, integrals, and their applications.'
WHEN 'Linear Algebra' THEN 'Explore vectors, matrices, and linear transformations.'
WHEN 'Mechanics' THEN 'Understand forces, motion, and energy.'
WHEN 'English Conversation' THEN 'Practice spoken English for everyday communication.'
WHEN 'Academic Writing' THEN 'Develop clear, structured writing for academic work.' ELSE name END;
