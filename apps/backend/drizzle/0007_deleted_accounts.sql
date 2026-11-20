CREATE TABLE "deleted_accounts" (
	"owner_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"kind" text NOT NULL,
	CONSTRAINT "deleted_accounts_owner_id_account_id_kind_pk" PRIMARY KEY("owner_id","account_id","kind")
);
--> statement-breakpoint
ALTER TABLE "deleted_accounts" ADD CONSTRAINT "deleted_accounts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;