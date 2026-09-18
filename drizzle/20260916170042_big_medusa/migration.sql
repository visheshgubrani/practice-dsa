ALTER TABLE "problems" ADD COLUMN "position" integer;--> statement-breakpoint
UPDATE "problems" SET "position" = "number" WHERE "position" IS NULL;--> statement-breakpoint
ALTER TABLE "problems" ALTER COLUMN "position" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "problems_position_idx" ON "problems" ("position","number");
