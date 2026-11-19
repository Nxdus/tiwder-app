DROP INDEX "active_student";--> statement-breakpoint
DROP INDEX "active_tutor";--> statement-breakpoint
CREATE INDEX "active_student" ON "matches" USING btree ("student_id") WHERE status='confirmed';--> statement-breakpoint
CREATE INDEX "active_tutor" ON "matches" USING btree ("tutor_id") WHERE status='confirmed';