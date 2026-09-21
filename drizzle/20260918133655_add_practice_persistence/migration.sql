CREATE TABLE "legacy_accepted" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"problem_id" uuid NOT NULL,
	"language" "language" NOT NULL,
	"source" text NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "problem_progress" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "submission_cases" ADD COLUMN "case_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "submission_cases" ADD COLUMN "hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "submission_cases" ADD COLUMN "debug" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "catalog_revision" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "request_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "legacy_accepted_problem_key" ON "legacy_accepted" ("problem_id");--> statement-breakpoint
CREATE INDEX "submissions_verified_accepted_idx" ON "submissions" ("problem_id","created_at" DESC NULLS LAST) WHERE "verdict" = 'accepted' AND "mode" = 'submit' AND "runner" = 'piston';--> statement-breakpoint
CREATE UNIQUE INDEX "submissions_request_id_key" ON "submissions" ("request_id");--> statement-breakpoint
ALTER TABLE "legacy_accepted" ADD CONSTRAINT "legacy_accepted_problem_id_problems_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE;