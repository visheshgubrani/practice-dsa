import type { StoredLanguageId } from "@/lib/languages";
import type {
  CaseResult,
  RunMode,
  RunnerKind,
  Verdict,
} from "@/lib/runner/types";

/**
 * JSON shapes for `/api/submissions`. Kept free of the database client so the
 * workspace can import them.
 */

export type SubmissionSummary = {
  id: string;
  slug: string;
  language: StoredLanguageId;
  mode: RunMode;
  runner: RunnerKind;
  verdict: Verdict;
  source: string;
  passedCount: number;
  totalCount: number;
  timeMs: number | null;
  memoryKb: number | null;
  catalogRevision: string;
  requestId: string | null;
  createdAt: string;
};

export type SubmissionDetail = SubmissionSummary & {
  testcaseIndex: number | null;
  compileOutput: string | null;
  pistonVersion: string | null;
  cases: CaseResult[];
};

export type SubmissionList = {
  items: SubmissionSummary[];
  total: number;
  limit: number;
  offset: number;
};
