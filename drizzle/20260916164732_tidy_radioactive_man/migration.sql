CREATE TYPE "chat_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "language" AS ENUM('cpp', 'python', 'java', 'javascript');--> statement-breakpoint
CREATE TYPE "progress_status" AS ENUM('todo', 'attempted', 'solved');--> statement-breakpoint
CREATE TYPE "run_mode" AS ENUM('run', 'submit');--> statement-breakpoint
CREATE TYPE "runner_kind" AS ENUM('mock', 'judge0');--> statement-breakpoint
CREATE TYPE "verdict" AS ENUM('accepted', 'wrong_answer', 'compile_error', 'runtime_error', 'time_limit_exceeded', 'internal_error');--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"thread_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"ui_id" text,
	"role" "chat_role" NOT NULL,
	"parts" jsonb DEFAULT '[]' NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"language" "language",
	"draft_source" text,
	"run_summary" text,
	"submission_id" uuid,
	"model" text,
	"finish_reason" text,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"total_tokens" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"problem_id" uuid NOT NULL,
	"title" text,
	"model" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"problem_id" uuid NOT NULL,
	"language" "language" NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "problem_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"problem_id" uuid NOT NULL,
	"status" "progress_status" DEFAULT 'todo'::"progress_status" NOT NULL,
	"preferred_language" "language",
	"user_notes_approach" text,
	"user_notes_time_complexity" text,
	"user_notes_space_complexity" text,
	"solved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "problem_examples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"problem_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"input" text NOT NULL,
	"output" text NOT NULL,
	"explanation" text
);
--> statement-breakpoint
CREATE TABLE "problem_starter_code" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"problem_id" uuid NOT NULL,
	"language" "language" NOT NULL,
	"source" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "problem_testcases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"problem_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"stdin" text NOT NULL,
	"expected" text NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"explanation" text
);
--> statement-breakpoint
CREATE TABLE "problems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"slug" text NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"difficulty" "difficulty" NOT NULL,
	"statement" text NOT NULL,
	"constraints" text[] DEFAULT '{}'::text[] NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"reference_approach" text DEFAULT '' NOT NULL,
	"reference_time_complexity" text DEFAULT '' NOT NULL,
	"reference_space_complexity" text DEFAULT '' NOT NULL,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "problems_number_positive" CHECK ("number" > 0)
);
--> statement-breakpoint
CREATE TABLE "submission_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"submission_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"status" "verdict" NOT NULL,
	"input" text DEFAULT '' NOT NULL,
	"expected" text DEFAULT '' NOT NULL,
	"stdout" text,
	"stderr" text,
	"time_ms" integer,
	"memory_kb" integer
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"problem_id" uuid NOT NULL,
	"language" "language" NOT NULL,
	"mode" "run_mode" NOT NULL,
	"runner" "runner_kind" NOT NULL,
	"verdict" "verdict" NOT NULL,
	"source" text NOT NULL,
	"testcase_index" integer,
	"passed_count" integer DEFAULT 0 NOT NULL,
	"total_count" integer DEFAULT 0 NOT NULL,
	"time_ms" integer,
	"memory_kb" integer,
	"compile_output" text,
	"judge0_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submissions_passed_lte_total" CHECK ("passed_count" <= "total_count")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "chat_messages_thread_seq_key" ON "chat_messages" ("thread_id","seq");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_messages_ui_id_key" ON "chat_messages" ("ui_id");--> statement-breakpoint
CREATE INDEX "chat_messages_thread_created_idx" ON "chat_messages" ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "chat_threads_problem_updated_idx" ON "chat_threads" ("problem_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "drafts_problem_language_key" ON "drafts" ("problem_id","language");--> statement-breakpoint
CREATE UNIQUE INDEX "problem_progress_problem_key" ON "problem_progress" ("problem_id");--> statement-breakpoint
CREATE UNIQUE INDEX "problem_examples_problem_position_key" ON "problem_examples" ("problem_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "problem_starter_code_problem_language_key" ON "problem_starter_code" ("problem_id","language");--> statement-breakpoint
CREATE UNIQUE INDEX "problem_testcases_problem_position_key" ON "problem_testcases" ("problem_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "problems_slug_key" ON "problems" ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "problems_number_key" ON "problems" ("number");--> statement-breakpoint
CREATE INDEX "problems_tags_idx" ON "problems" USING gin ("tags");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_cases_submission_position_key" ON "submission_cases" ("submission_id","position");--> statement-breakpoint
CREATE INDEX "submissions_problem_created_idx" ON "submissions" ("problem_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "submissions_accepted_idx" ON "submissions" ("problem_id","created_at" DESC NULLS LAST) WHERE "verdict" = 'accepted';--> statement-breakpoint
CREATE UNIQUE INDEX "submissions_judge0_token_key" ON "submissions" ("judge0_token");--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_thread_id_chat_threads_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "chat_threads"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_submission_id_submissions_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_problem_id_problems_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_problem_id_problems_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "problem_progress" ADD CONSTRAINT "problem_progress_problem_id_problems_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "problem_examples" ADD CONSTRAINT "problem_examples_problem_id_problems_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "problem_starter_code" ADD CONSTRAINT "problem_starter_code_problem_id_problems_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "problem_testcases" ADD CONSTRAINT "problem_testcases_problem_id_problems_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "submission_cases" ADD CONSTRAINT "submission_cases_submission_id_submissions_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_problem_id_problems_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE;