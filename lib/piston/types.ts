import { z } from "zod";

/**
 * The engine's wire format, as far as this app uses it.
 *
 * Piston answers `POST /api/v2/execute` with a `run` stage and — for languages
 * with a compile step — a `compile` stage. Both stages share one shape; the
 * fields that matter are `code`/`signal` (what happened) and `status` (the two
 * letter reason, when the sandbox itself stopped it).
 *
 * Everything is nullable because Piston omits or nulls fields depending on how
 * the process died, and a verdict is not worth crashing over.
 */

/** `TO` timeout, `OL`/`EL` output-buffer overflow, `RE` runtime error, `SG` signal. */
const STAGE_STATUSES = ["TO", "OL", "EL", "RE", "SG", "XX"] as const;
export type StageStatus = (typeof STAGE_STATUSES)[number];

export const stageSchema = z.object({
  stdout: z.string().default(""),
  stderr: z.string().default(""),
  output: z.string().default(""),
  code: z.number().nullable().default(null),
  signal: z.string().nullable().default(null),
  message: z.string().nullable().default(null),
  status: z.string().nullable().default(null),
  /** Algorithm-contest metric: CPU milliseconds, excluding IO and context switches. */
  cpu_time: z.number().nullable().default(null),
  /** Wall-clock milliseconds, including everything the process waited on. */
  wall_time: z.number().nullable().default(null),
  /** Peak memory in bytes, or null when the sandbox did not report it. */
  memory: z.number().nullable().default(null),
});

export type Stage = z.infer<typeof stageSchema>;

export const executeResponseSchema = z.object({
  language: z.string(),
  version: z.string(),
  compile: stageSchema.optional(),
  run: stageSchema.optional(),
});

export type ExecuteResponse = z.infer<typeof executeResponseSchema>;

export const runtimeSchema = z.object({
  language: z.string(),
  version: z.string(),
  aliases: z.array(z.string()).default([]),
  runtime: z.string().optional(),
});

export type Runtime = z.infer<typeof runtimeSchema>;

/** The engine's own error body, e.g. `{"message":"c++-1.2.3 runtime is unknown"}`. */
export const errorSchema = z.object({ message: z.string() });

export function stageStatus(stage: Stage | undefined): StageStatus | null {
  const status = stage?.status;
  return STAGE_STATUSES.includes(status as StageStatus)
    ? (status as StageStatus)
    : null;
}
