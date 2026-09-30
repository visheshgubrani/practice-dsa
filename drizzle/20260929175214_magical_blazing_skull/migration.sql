CREATE TYPE "review_rating" AS ENUM('again', 'hard', 'good', 'easy');--> statement-breakpoint
CREATE TABLE "review_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"problem_id" uuid NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"card" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"scheduler_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"request_id" uuid NOT NULL,
	"problem_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"rating" "review_rating" NOT NULL,
	"expected_revision" integer NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	"before_card" jsonb NOT NULL,
	"after_card" jsonb NOT NULL,
	"fsrs_log" jsonb NOT NULL,
	"scheduler_version" text NOT NULL,
	"revision_after" integer NOT NULL,
	"next" jsonb NOT NULL,
	"submission_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "review_cards_problem_key" ON "review_cards" ("problem_id");--> statement-breakpoint
CREATE INDEX "review_cards_due_at_idx" ON "review_cards" ("due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "review_logs_request_id_key" ON "review_logs" ("request_id");--> statement-breakpoint
CREATE INDEX "review_logs_card_reviewed_idx" ON "review_logs" ("card_id","reviewed_at");--> statement-breakpoint
ALTER TABLE "review_cards" ADD CONSTRAINT "review_cards_problem_id_problems_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_problem_id_problems_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_card_id_review_cards_id_fkey" FOREIGN KEY ("card_id") REFERENCES "review_cards"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_submission_id_submissions_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE SET NULL;