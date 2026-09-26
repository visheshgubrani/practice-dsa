import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { ArgValue } from "@/lib/harness/args";
import type { ProblemSignature } from "@/lib/problems";

import { timestamps } from "./columns";
import { compareModeEnum, difficultyEnum, languageEnum } from "./enums";

/**
 * The problem catalog — the database side of `Problem` in `@/lib/problems`.
 *
 * Authored modules under `lib/problems/` are the seed input (`lib/db/seed.ts`
 * copies them in here). The public types in `@/lib/problems` are the shared
 * shape the UI renders; the app reads these tables through
 * lib/db/queries/problems.ts.
 *
 * `tags` and `constraints` are Postgres arrays rather than child tables because
 * the UI treats them as an ordered bag of strings on the problem, so a row
 * crosses to the client with no join and no re-aggregation.
 */
export const problems = pgTable(
  "problems",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** URL segment: /problems/[slug]. */
    slug: text("slug").notNull(),
    /** LeetCode number, rendered as "1. Two Sum". */
    number: integer("number").notNull(),
    /**
     * The catalog's authored order — what the list page and the previous/next
     * arrows follow. No default: an insert states where the problem belongs.
     */
    position: integer("position").notNull(),
    title: text("title").notNull(),
    difficulty: difficultyEnum("difficulty").notNull(),
    /**
     * The roadmap group this problem belongs to ("Stack", "1-D Dynamic
     * Programming"), seeded from `lib/problems/topics.ts`. Text rather than an
     * enum: the group list is authored data that grows with the catalog, and a
     * new group should not need a database migration.
     *
     * Blank means "not classified yet" — a row that predates the topic backfill
     * or a problem authored without a group. The dashboard folds those into
     * "Uncategorized" instead of hiding them.
     */
    topic: text("topic").notNull().default(""),
    /** Markdown, rendered by components/markdown.tsx. */
    statement: text("statement").notNull(),
    constraints: text("constraints").array().notNull().default(sql`'{}'::text[]`),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    /**
     * The app's own reference solution summary. It is part of the problem (the
     * tutor prompt cites it), not the user's notes — those live on
     * `problem_progress`.
     */
    referenceApproach: text("reference_approach").notNull().default(""),
    referenceTimeComplexity: text("reference_time_complexity")
      .notNull()
      .default(""),
    referenceSpaceComplexity: text("reference_space_complexity")
      .notNull()
      .default(""),
    /** Set once a problem is imported from elsewhere instead of authored here. */
    sourceUrl: text("source_url"),
    /**
     * `Problem.signature` — the function the harness calls, and the types of its
     * arguments and return value. jsonb rather than columns because it is read
     * and written whole: the runner needs the spec, not a queryable slice of it.
     */
    signature: jsonb("signature").$type<ProblemSignature>().notNull(),
    /**
     * How `expected` is compared, unless a testcase overrides it. The default is
     * the strict one, so a problem added without an opinion is judged exactly.
     */
    compare: compareModeEnum("compare").notNull().default("exact"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("problems_slug_key").on(t.slug),
    uniqueIndex("problems_number_key").on(t.number),
    // Serves the list ordering and both previous/next lookups. Not unique: a
    // curated order may tie, and the queries break ties on `number`.
    index("problems_position_idx").on(t.position, t.number),
    // The list page filters by tag, which is an array containment check.
    index("problems_tags_idx").using("gin", t.tags),
    // The dashboard groups by topic and keeps the authored order inside a group.
    index("problems_topic_position_idx").on(t.topic, t.position),
    check("problems_number_positive", sql`${t.number} > 0`),
    check("problems_topic_not_blank", sql`${t.topic} <> ''`),
  ],
);

/** `Problem.examples`, ordered. */
export const problemExamples = pgTable(
  "problem_examples",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    input: text("input").notNull(),
    output: text("output").notNull(),
    explanation: text("explanation"),
  },
  (t) => [
    uniqueIndex("problem_examples_problem_position_key").on(
      t.problemId,
      t.position,
    ),
  ],
);

/**
 * `Problem.testcases`, ordered.
 *
 * `args` (column `arguments`) is the authoritative input. Displayed console
 * stdin is generated from it at read time. `isHidden` separates the cases the
 * console shows from the ones only the runner should use.
 */
export const problemTestcases = pgTable(
  "problem_testcases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    args: jsonb("arguments").$type<ArgValue[]>().notNull(),
    expected: text("expected").notNull(),
    isHidden: boolean("is_hidden").notNull().default(false),
    /** Overrides `problems.compare` for this case alone. */
    compare: compareModeEnum("compare"),
    explanation: text("explanation"),
  },
  (t) => [
    uniqueIndex("problem_testcases_problem_position_key").on(
      t.problemId,
      t.position,
    ),
  ],
);

/** `Problem.starterCode`, one row per problem and language. */
export const problemStarterCode = pgTable(
  "problem_starter_code",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    language: languageEnum("language").notNull(),
    source: text("source").notNull(),
  },
  (t) => [
    uniqueIndex("problem_starter_code_problem_language_key").on(
      t.problemId,
      t.language,
    ),
  ],
);
