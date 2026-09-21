import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import {
  DEFAULT_LANGUAGE,
  STORED_LANGUAGES,
  type StoredLanguageId,
} from "@/lib/languages";
import type { SolutionNotes } from "@/lib/problems";
import type {
  PracticeImportResult,
  PracticeProgress,
  PracticeState,
  VerifiedAccepted,
} from "@/lib/practice/types";
import { isVerifiedAcceptance } from "@/lib/runner/types";

import { db } from "../index";
import {
  drafts,
  legacyAccepted,
  problemProgress,
  problems,
  submissions,
} from "../schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Practice reads and writes: drafts, notes, preferences, and the latest
 * verified accepted submission. Status / `solvedAt` are never written here —
 * those flip only when a genuine Piston Submit is stored (Phase 3.5).
 */

const storedLanguageSchema = z.enum(STORED_LANGUAGES);
const slugSchema = z.string().min(1).max(200);

export const practiceGetQuerySchema = z.object({
  language: storedLanguageSchema.default(DEFAULT_LANGUAGE),
});

const notesPatchSchema = z
  .object({
    approach: z.string().max(20_000).optional(),
    timeComplexity: z.string().max(200).optional(),
    spaceComplexity: z.string().max(200).optional(),
  })
  .strict()
  .refine(
    (notes) =>
      notes.approach !== undefined ||
      notes.timeComplexity !== undefined ||
      notes.spaceComplexity !== undefined,
    { message: "notes must include at least one field." },
  );

export const practicePatchSchema = z
  .object({
    language: storedLanguageSchema.optional(),
    draft: z
      .object({
        source: z.string().max(200_000),
        /** 0 means "no server row yet". Omit to last-write-wins. */
        revision: z.number().int().min(0).optional(),
      })
      .strict()
      .optional(),
    notes: notesPatchSchema.optional(),
    preferredLanguage: storedLanguageSchema.nullable().optional(),
    /** Shared by notes and preferred language; 0 means "no server row yet". */
    progressRevision: z.number().int().min(0).optional(),
  })
  .strict()
  .refine(
    (body) =>
      body.draft !== undefined ||
      body.notes !== undefined ||
      body.preferredLanguage !== undefined,
    { message: "PATCH must include draft, notes, or preferredLanguage." },
  );

export type PracticePatch = z.infer<typeof practicePatchSchema>;

export const practiceImportSchema = z
  .object({
    drafts: z
      .array(
        z.object({
          slug: slugSchema,
          language: storedLanguageSchema,
          source: z.string().max(200_000),
        }),
      )
      .max(200)
      .optional(),
    notes: z
      .array(
        z.object({
          slug: slugSchema,
          approach: z.string().max(20_000).optional(),
          timeComplexity: z.string().max(200).optional(),
          spaceComplexity: z.string().max(200).optional(),
        }),
      )
      .max(200)
      .optional(),
    preferences: z
      .array(
        z.object({
          slug: slugSchema,
          language: storedLanguageSchema,
        }),
      )
      .max(200)
      .optional(),
    legacyAccepted: z
      .array(
        z.object({
          slug: slugSchema,
          language: storedLanguageSchema,
          source: z.string().max(200_000),
          at: z.string().max(40).optional(),
        }),
      )
      .max(200)
      .optional(),
  })
  .strict();

export type PracticeImport = z.infer<typeof practiceImportSchema>;

export type {
  LegacySnapshot,
  PracticeDraft,
  PracticeImportPayload,
  PracticeImportResult,
  PracticeProgress,
  PracticeState,
  VerifiedAccepted,
} from "@/lib/practice/types";

export class PracticeConflictError extends Error {
  readonly resource: "draft" | "progress";
  readonly revision: number;
  readonly updatedAt: string | null;

  constructor(
    resource: "draft" | "progress",
    revision: number,
    updatedAt: string | null,
  ) {
    super(`The ${resource} was updated in another tab.`);
    this.name = "PracticeConflictError";
    this.resource = resource;
    this.revision = revision;
    this.updatedAt = updatedAt;
  }
}

type ProgressFields = {
  preferredLanguage: StoredLanguageId | null;
  userNotesApproach: string | null;
  userNotesTimeComplexity: string | null;
  userNotesSpaceComplexity: string | null;
};

export type ProgressImportIncoming = {
  preferredLanguage?: StoredLanguageId;
  notes?: {
    approach?: string;
    timeComplexity?: string;
    spaceComplexity?: string;
  };
};

/**
 * Import fills only empty columns. A stored value — including an empty string
 * the user saved — is left alone, so a repeat import cannot clobber Postgres.
 */
export function mergeProgressImport(
  existing: ProgressFields | null,
  incoming: ProgressImportIncoming,
): { fields: ProgressFields; writes: boolean } {
  const fields: ProgressFields = {
    preferredLanguage:
      existing?.preferredLanguage ?? incoming.preferredLanguage ?? null,
    userNotesApproach:
      existing?.userNotesApproach ?? incoming.notes?.approach ?? null,
    userNotesTimeComplexity:
      existing?.userNotesTimeComplexity ??
      incoming.notes?.timeComplexity ??
      null,
    userNotesSpaceComplexity:
      existing?.userNotesSpaceComplexity ??
      incoming.notes?.spaceComplexity ??
      null,
  };

  if (existing == null) {
    return {
      fields,
      writes:
        fields.preferredLanguage != null ||
        fields.userNotesApproach != null ||
        fields.userNotesTimeComplexity != null ||
        fields.userNotesSpaceComplexity != null,
    };
  }

  return {
    fields,
    writes:
      existing.preferredLanguage !== fields.preferredLanguage ||
      existing.userNotesApproach !== fields.userNotesApproach ||
      existing.userNotesTimeComplexity !== fields.userNotesTimeComplexity ||
      existing.userNotesSpaceComplexity !== fields.userNotesSpaceComplexity,
  };
}

export function parseOptionalDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function problemIdBySlug(slug: string) {
  return db.query.problems.findFirst({
    where: { slug },
    columns: { id: true, slug: true },
  });
}

function toNotes(row: {
  userNotesApproach: string | null;
  userNotesTimeComplexity: string | null;
  userNotesSpaceComplexity: string | null;
}): SolutionNotes | null {
  if (
    row.userNotesApproach == null &&
    row.userNotesTimeComplexity == null &&
    row.userNotesSpaceComplexity == null
  ) {
    return null;
  }
  return {
    approach: row.userNotesApproach ?? "",
    timeComplexity: row.userNotesTimeComplexity ?? "",
    spaceComplexity: row.userNotesSpaceComplexity ?? "",
  };
}

function toProgress(row: {
  status: PracticeProgress["status"];
  preferredLanguage: StoredLanguageId | null;
  solvedAt: Date | null;
  revision: number;
  updatedAt: Date;
} | null): PracticeProgress {
  if (!row) {
    return {
      status: "todo",
      preferredLanguage: null,
      solvedAt: null,
      revision: 0,
      updatedAt: null,
    };
  }
  return {
    status: row.status,
    preferredLanguage: row.preferredLanguage,
    solvedAt: row.solvedAt?.toISOString() ?? null,
    revision: row.revision,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toVerifiedAccepted(row: {
  id: string;
  language: StoredLanguageId;
  source: string;
  createdAt: Date;
  catalogRevision: string;
  mode: "run" | "submit";
  runner: "mock" | "piston" | "judge0";
  verdict: string;
}): VerifiedAccepted | null {
  if (
    !isVerifiedAcceptance({
      mode: row.mode,
      runner: row.runner,
      verdict: row.verdict as "accepted",
    })
  ) {
    return null;
  }
  return {
    id: row.id,
    language: row.language,
    source: row.source,
    at: row.createdAt.toISOString(),
    catalogRevision: row.catalogRevision,
  };
}

export async function getPractice(
  slug: string,
  language: StoredLanguageId = DEFAULT_LANGUAGE,
): Promise<PracticeState | null> {
  const problem = await problemIdBySlug(slug);
  if (!problem) return null;

  const [draft, progress, latest, legacy] = await Promise.all([
    db.query.drafts.findFirst({
      where: { problemId: problem.id, language },
    }),
    db.query.problemProgress.findFirst({
      where: { problemId: problem.id },
    }),
    db
      .select()
      .from(submissions)
      .where(
        and(
          eq(submissions.problemId, problem.id),
          eq(submissions.verdict, "accepted"),
          eq(submissions.mode, "submit"),
          eq(submissions.runner, "piston"),
        ),
      )
      .orderBy(desc(submissions.createdAt))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db.query.legacyAccepted.findFirst({
      where: { problemId: problem.id },
    }),
  ]);

  return {
    slug: problem.slug,
    draft: draft
      ? {
          language: draft.language,
          source: draft.source,
          revision: draft.revision,
          updatedAt: draft.updatedAt.toISOString(),
        }
      : null,
    notes: progress ? toNotes(progress) : null,
    progress: toProgress(progress ?? null),
    latestAccepted: latest ? toVerifiedAccepted(latest) : null,
    legacySnapshot: legacy
      ? {
          language: legacy.language,
          source: legacy.source,
          at: (legacy.acceptedAt ?? legacy.createdAt).toISOString(),
          label: "legacy snapshot",
        }
      : null,
  };
}

function conflictFrom(
  resource: "draft" | "progress",
  row: { revision: number; updatedAt: Date } | null,
): PracticeConflictError {
  return new PracticeConflictError(
    resource,
    row?.revision ?? 0,
    row?.updatedAt.toISOString() ?? null,
  );
}

async function saveDraft(
  tx: Tx,
  problemId: string,
  language: StoredLanguageId,
  source: string,
  expectedRevision: number | undefined,
): Promise<void> {
  const existing = await tx.query.drafts.findFirst({
    where: { problemId, language },
  });
  const current = existing?.revision ?? 0;
  if (expectedRevision !== undefined && expectedRevision !== current) {
    throw conflictFrom("draft", existing ?? null);
  }

  if (!existing) {
    await tx.insert(drafts).values({
      problemId,
      language,
      source,
      revision: 1,
    });
    return;
  }

  await tx
    .update(drafts)
    .set({ source, revision: sql`${drafts.revision} + 1` })
    .where(and(eq(drafts.id, existing.id), eq(drafts.revision, existing.revision)));
}

async function saveProgress(
  tx: Tx,
  problemId: string,
  patch: Pick<PracticePatch, "notes" | "preferredLanguage" | "progressRevision">,
): Promise<void> {
  const existing = await tx.query.problemProgress.findFirst({
    where: { problemId },
  });
  const current = existing?.revision ?? 0;
  if (
    patch.progressRevision !== undefined &&
    patch.progressRevision !== current
  ) {
    throw conflictFrom("progress", existing ?? null);
  }

  const notes = patch.notes;
  if (!existing) {
    await tx.insert(problemProgress).values({
      problemId,
      preferredLanguage: patch.preferredLanguage ?? null,
      userNotesApproach: notes?.approach ?? null,
      userNotesTimeComplexity: notes?.timeComplexity ?? null,
      userNotesSpaceComplexity: notes?.spaceComplexity ?? null,
      revision: 1,
    });
    return;
  }

  await tx
    .update(problemProgress)
    .set({
      ...(patch.preferredLanguage !== undefined
        ? { preferredLanguage: patch.preferredLanguage }
        : {}),
      ...(notes?.approach !== undefined
        ? { userNotesApproach: notes.approach }
        : {}),
      ...(notes?.timeComplexity !== undefined
        ? { userNotesTimeComplexity: notes.timeComplexity }
        : {}),
      ...(notes?.spaceComplexity !== undefined
        ? { userNotesSpaceComplexity: notes.spaceComplexity }
        : {}),
      revision: sql`${problemProgress.revision} + 1`,
    })
    .where(
      and(
        eq(problemProgress.id, existing.id),
        eq(problemProgress.revision, existing.revision),
      ),
    );
}

export async function patchPractice(
  slug: string,
  body: PracticePatch,
): Promise<PracticeState | null> {
  const problem = await problemIdBySlug(slug);
  if (!problem) return null;

  const language = body.language ?? DEFAULT_LANGUAGE;

  await db.transaction(async (tx) => {
    if (body.draft) {
      await saveDraft(
        tx,
        problem.id,
        language,
        body.draft.source,
        body.draft.revision,
      );
    }
    if (body.notes !== undefined || body.preferredLanguage !== undefined) {
      await saveProgress(tx, problem.id, body);
    }
  });

  return getPractice(slug, language);
}

export async function importPractice(
  input: PracticeImport,
): Promise<PracticeImportResult> {
  const result: PracticeImportResult = {
    draftsInserted: 0,
    draftsSkipped: 0,
    progressWritten: 0,
    progressSkipped: 0,
    legacyInserted: 0,
    legacySkipped: 0,
    unknownSlugs: [],
  };

  const slugs = [
    ...new Set(
      [
        ...(input.drafts ?? []).map((entry) => entry.slug),
        ...(input.notes ?? []).map((entry) => entry.slug),
        ...(input.preferences ?? []).map((entry) => entry.slug),
        ...(input.legacyAccepted ?? []).map((entry) => entry.slug),
      ].filter((slug) => slug.length > 0),
    ),
  ];

  if (slugs.length === 0) return result;

  return db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: problems.id, slug: problems.slug })
      .from(problems)
      .where(inArray(problems.slug, slugs));

    const bySlug = new Map(rows.map((row) => [row.slug, row.id]));
    const unknown = new Set<string>();
    for (const slug of slugs) {
      if (!bySlug.has(slug)) unknown.add(slug);
    }
    result.unknownSlugs = [...unknown].sort();

    for (const entry of input.drafts ?? []) {
      const problemId = bySlug.get(entry.slug);
      if (!problemId) {
        result.draftsSkipped += 1;
        continue;
      }
      const inserted = await tx
        .insert(drafts)
        .values({
          problemId,
          language: entry.language,
          source: entry.source,
          revision: 1,
        })
        .onConflictDoNothing({
          target: [drafts.problemId, drafts.language],
        })
        .returning({ id: drafts.id });
      if (inserted.length === 0) result.draftsSkipped += 1;
      else result.draftsInserted += 1;
    }

    const progressBySlug = new Map<string, ProgressImportIncoming>();
    for (const entry of input.notes ?? []) {
      const current = progressBySlug.get(entry.slug) ?? {};
      progressBySlug.set(entry.slug, {
        ...current,
        notes: {
          approach: entry.approach,
          timeComplexity: entry.timeComplexity,
          spaceComplexity: entry.spaceComplexity,
        },
      });
    }
    for (const entry of input.preferences ?? []) {
      const current = progressBySlug.get(entry.slug) ?? {};
      progressBySlug.set(entry.slug, {
        ...current,
        preferredLanguage: entry.language,
      });
    }

    for (const [slug, incoming] of progressBySlug) {
      const problemId = bySlug.get(slug);
      if (!problemId) {
        result.progressSkipped += 1;
        continue;
      }
      const existing = await tx.query.problemProgress.findFirst({
        where: { problemId },
      });
      const merged = mergeProgressImport(
        existing
          ? {
              preferredLanguage: existing.preferredLanguage,
              userNotesApproach: existing.userNotesApproach,
              userNotesTimeComplexity: existing.userNotesTimeComplexity,
              userNotesSpaceComplexity: existing.userNotesSpaceComplexity,
            }
          : null,
        incoming,
      );
      if (!merged.writes) {
        result.progressSkipped += 1;
        continue;
      }
      if (!existing) {
        await tx.insert(problemProgress).values({
          problemId,
          preferredLanguage: merged.fields.preferredLanguage,
          userNotesApproach: merged.fields.userNotesApproach,
          userNotesTimeComplexity: merged.fields.userNotesTimeComplexity,
          userNotesSpaceComplexity: merged.fields.userNotesSpaceComplexity,
          revision: 1,
        });
      } else {
        await tx
          .update(problemProgress)
          .set({
            preferredLanguage: merged.fields.preferredLanguage,
            userNotesApproach: merged.fields.userNotesApproach,
            userNotesTimeComplexity: merged.fields.userNotesTimeComplexity,
            userNotesSpaceComplexity: merged.fields.userNotesSpaceComplexity,
            revision: sql`${problemProgress.revision} + 1`,
          })
          .where(eq(problemProgress.id, existing.id));
      }
      result.progressWritten += 1;
    }

    for (const entry of input.legacyAccepted ?? []) {
      const problemId = bySlug.get(entry.slug);
      if (!problemId) {
        result.legacySkipped += 1;
        continue;
      }
      const inserted = await tx
        .insert(legacyAccepted)
        .values({
          problemId,
          language: entry.language,
          source: entry.source,
          acceptedAt: parseOptionalDate(entry.at),
        })
        .onConflictDoNothing({ target: legacyAccepted.problemId })
        .returning({ id: legacyAccepted.id });
      if (inserted.length === 0) result.legacySkipped += 1;
      else result.legacyInserted += 1;
    }

    return result;
  });
}
