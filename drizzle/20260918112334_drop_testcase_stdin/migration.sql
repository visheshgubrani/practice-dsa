ALTER TABLE "problem_testcases" DROP COLUMN "stdin";--> statement-breakpoint
ALTER TABLE "problem_testcases" ALTER COLUMN "arguments" SET NOT NULL;