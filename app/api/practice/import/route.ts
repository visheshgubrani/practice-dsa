import {
  importPractice,
  practiceImportSchema,
} from "@/lib/db/queries/practice";

/**
 * Import browser `dsa.*` keys into Postgres. Repeatable: existing database
 * values are left alone, unknown slugs are skipped, and legacy accepted code
 * is stored as a labeled snapshot — never as verified solved status.
 */

async function readJson(request: Request): Promise<
  { ok: true; value: unknown } | { ok: false; response: Response }
> {
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return {
      ok: false,
      response: Response.json({ error: "Invalid JSON body." }, { status: 400 }),
    };
  }
}

export async function POST(request: Request) {
  const json = await readJson(request);
  if (!json.ok) return json.response;

  const parsed = practiceImportSchema.safeParse(json.value);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid import payload.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await importPractice(parsed.data);
    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not import practice data.";
    return Response.json({ error: message }, { status: 500 });
  }
}
