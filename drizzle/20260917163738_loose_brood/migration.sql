CREATE TYPE "compare_mode" AS ENUM('exact', 'unordered');--> statement-breakpoint
ALTER TYPE "runner_kind" ADD VALUE 'piston' BEFORE 'judge0';--> statement-breakpoint
DROP INDEX "submissions_judge0_token_key";--> statement-breakpoint
ALTER TABLE "problem_testcases" ADD COLUMN "compare" "compare_mode";--> statement-breakpoint
-- Added nullable so the existing catalog rows survive the ALTER; `pnpm db:seed`
-- fills every row in, and the constraint below is what pins the column down.
ALTER TABLE "problems" ADD COLUMN "signature" jsonb;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "compare" "compare_mode" DEFAULT 'exact'::"compare_mode" NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "piston_version" text;--> statement-breakpoint
ALTER TABLE "submissions" DROP COLUMN "judge0_token";--> statement-breakpoint
UPDATE "problems" SET "signature" = '{"name":"","params":[],"returns":"void"}'::jsonb WHERE "signature" IS NULL;--> statement-breakpoint
ALTER TABLE "problems" ALTER COLUMN "signature" SET NOT NULL;