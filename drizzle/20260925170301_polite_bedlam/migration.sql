ALTER TABLE "problems" ADD COLUMN "topic" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "utc_offset_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "day" date;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "is_revision" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "problems_topic_position_idx" ON "problems" ("topic","position");--> statement-breakpoint
CREATE INDEX "submissions_day_idx" ON "submissions" ("day");--> statement-breakpoint
-- Hand-added, and the only hand-written statement in this file: the generated
-- migration adds `topic` with a blank default while the check below refuses a
-- blank topic, so existing rows have to be filled first. drizzle-kit cannot
-- express a data backfill, and this one cannot wait for the day-stamps backfill
-- either (it runs between migrations). `pnpm db:seed`, which runs immediately
-- after this migration on every setup, replaces the placeholder with the real
-- roadmap group from lib/problems/topics.ts.
UPDATE "problems" SET "topic" = 'Arrays & Hashing' WHERE "topic" = '';--> statement-breakpoint
ALTER TABLE "problems" ADD CONSTRAINT "problems_topic_not_blank" CHECK ("topic" <> '');--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_utc_offset_range" CHECK ("utc_offset_minutes" between -840 and 840);
