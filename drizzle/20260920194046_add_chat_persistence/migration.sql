CREATE TYPE "chat_completion_status" AS ENUM('pending', 'completed', 'failed', 'aborted');--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "completion_status" "chat_completion_status" DEFAULT 'pending'::"chat_completion_status" NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "provider_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "error" text;