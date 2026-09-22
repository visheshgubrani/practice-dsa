import { VisualizerError } from "@/lib/visualizer/errors";
import { visualizeTrace } from "@/lib/visualizer/trace";
import { visualizeRequestSchema } from "@/lib/visualizer/types";

/**
 * Traces one visible case of one problem, for the visualizer.
 *
 * A read in every sense that matters: it loads public problem content, runs the
 * editor's buffer once inside the judging sandbox, and returns the steps. It
 * writes no submission, no draft, no progress — visualizing is not running, and
 * it is not submitting. The route imports nothing that could write.
 */

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = visualizeRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid visualize request.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    return Response.json(await visualizeTrace(parsed.data));
  } catch (error) {
    if (error instanceof VisualizerError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "The trace failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
