import type { StoredLanguageId } from "@/lib/languages";
import type { SolutionNotes } from "@/lib/problems";

/**
 * JSON shapes for `/api/practice/*`. Kept free of the database client so the
 * workspace can import them.
 */

export type PracticeDraft = {
  language: StoredLanguageId;
  source: string;
  revision: number;
  updatedAt: string;
};

export type PracticeProgress = {
  status: "todo" | "attempted" | "solved";
  preferredLanguage: StoredLanguageId | null;
  solvedAt: string | null;
  revision: number;
  updatedAt: string | null;
};

export type VerifiedAccepted = {
  id: string;
  language: StoredLanguageId;
  source: string;
  at: string;
  catalogRevision: string;
};

export type LegacySnapshot = {
  language: StoredLanguageId;
  source: string;
  at: string;
  label: "legacy snapshot";
};

export type PracticeState = {
  slug: string;
  draft: PracticeDraft | null;
  notes: SolutionNotes | null;
  progress: PracticeProgress;
  latestAccepted: VerifiedAccepted | null;
  legacySnapshot: LegacySnapshot | null;
};

export type PracticeConflictBody = {
  error: string;
  resource: "draft" | "progress";
  revision: number;
  updatedAt: string | null;
};

export type PracticePatchBody = {
  language?: StoredLanguageId;
  draft?: { source: string; revision?: number };
  notes?: {
    approach?: string;
    timeComplexity?: string;
    spaceComplexity?: string;
  };
  preferredLanguage?: StoredLanguageId | null;
  progressRevision?: number;
};

export type PracticeImportPayload = {
  drafts?: Array<{
    slug: string;
    language: StoredLanguageId;
    source: string;
  }>;
  notes?: Array<{
    slug: string;
    approach?: string;
    timeComplexity?: string;
    spaceComplexity?: string;
  }>;
  preferences?: Array<{ slug: string; language: StoredLanguageId }>;
  legacyAccepted?: Array<{
    slug: string;
    language: StoredLanguageId;
    source: string;
    at?: string;
  }>;
};

export type PracticeImportResult = {
  draftsInserted: number;
  draftsSkipped: number;
  progressWritten: number;
  progressSkipped: number;
  legacyInserted: number;
  legacySkipped: number;
  unknownSlugs: string[];
};

export const SAVE_DEBOUNCE_MS = 500;
