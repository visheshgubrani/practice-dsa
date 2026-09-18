import { runSubmission, InvalidRunRequestError } from "@/lib/runner";
import { runRequestSchema } from "@/lib/runner/types";

/**
 * Executes one Run or Submit. Repeatable without limits — the UI keeps no
 * submission history, it just renders the newest result in the console.
 */
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

  try {
    const result = await runSubmission(parsed.data);
    return Response.json(result);
  } catch (error) {
    if (error instanceof InvalidRunRequestError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Execution failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
