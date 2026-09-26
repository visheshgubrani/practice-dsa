import { getPractice } from "@/lib/db/queries/practice";
import {
  getSubmissionByRequestId,
  persistRunResult,
  toRunResult,
} from "@/lib/db/queries/submissions";
import { runSubmission, InvalidRunRequestError } from "@/lib/runner";
import { runRequestSchema, type RunResult } from "@/lib/runner/types";
import type { PracticeProgress, VerifiedAccepted } from "@/lib/practice/types";

/**
 * Executes one Run or Submit, then stores the completed result. The engine
 * runs outside a database transaction; history, cases, and progress are
 * written together afterwards. A save failure still returns the verdict.
 */

type PersistedRunResult = RunResult & {
  persisted: boolean;
  submissionId?: string;
  progress?: PracticeProgress;
  latestAccepted?: VerifiedAccepted | null;
};

function withPersist(
  result: RunResult,
  extra: {
    persisted: boolean;
    submissionId?: string;
    progress?: PracticeProgress;
    latestAccepted?: VerifiedAccepted | null;
  },
): PersistedRunResult {
  return {
    ...result,
    persisted: extra.persisted,
    ...(extra.submissionId ? { submissionId: extra.submissionId } : {}),
    ...(extra.progress ? { progress: extra.progress } : {}),
    ...(extra.latestAccepted !== undefined
      ? { latestAccepted: extra.latestAccepted }
      : {}),
  };
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = runRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid run request.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const body = parsed.data;

  try {
    if (body.requestId) {
      const existing = await getSubmissionByRequestId(body.requestId);
      if (existing) {
        const practice = await getPractice(body.slug, body.language);
        return Response.json(
          withPersist(toRunResult(existing), {
            persisted: true,
            submissionId: existing.id,
            ...(practice
              ? {
                  progress: practice.progress,
                  latestAccepted: practice.latestAccepted,
                }
              : {}),
          }),
        );
      }
    }

    const result = await runSubmission(body);

    try {
      const stored = await persistRunResult({
        slug: body.slug,
        language: body.language,
        source: body.source,
        testcaseIndex: body.testcaseIndex,
        requestId: body.requestId,
        utcOffsetMinutes: body.utcOffsetMinutes,
        revision: body.revision,
        result,
      });
      const practice = await getPractice(body.slug, body.language);
      return Response.json(
        withPersist(result, {
          persisted: true,
          submissionId: stored.id,
          ...(practice
            ? {
                progress: practice.progress,
                latestAccepted: practice.latestAccepted,
              }
            : {}),
        }),
      );
    } catch {
      return Response.json(withPersist(result, { persisted: false }));
    }
  } catch (error) {
    if (error instanceof InvalidRunRequestError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Execution failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
