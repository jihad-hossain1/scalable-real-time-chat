ALTER TABLE "conversations" ADD COLUMN "group_id" uuid DEFAULT null;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "is_group_conversation" boolean DEFAULT false;