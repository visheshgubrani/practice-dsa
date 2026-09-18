import { deepseek } from "@ai-sdk/deepseek";
import {
  convertToModelMessages,
  streamText,
  validateUIMessages,
  type UIMessage,
} from "ai";
import { z } from "zod";

import { demoChatResponse } from "@/lib/ai/demo";
import {
  buildDemoAnswer,
  buildTutorInstructions,
  truncateForContext,
} from "@/lib/ai/prompts";
import { getProblem } from "@/lib/db/queries/problems";
import { getLanguage } from "@/lib/languages";

const bodySchema = z.object({
  messages: z.array(z.unknown()).min(1),
  problemSlug: z.string().min(1).max(200),
  language: z.enum(["python"]),
  code: z.string().max(200_000).optional(),
  /** One-line summary of the last run, so "why is this failing?" has data. */
  runSummary: z.string().max(4000).optional(),
});

function lastUserText(messages: UIMessage[]): string | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") continue;
    const text = message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(" ")
      .trim();
    if (text.length > 0) return text;
  }
  return undefined;
}

export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid chat request." }, { status: 400 });
  }

  const problem = await getProblem(body.problemSlug);
  if (!problem) {
    return Response.json({ error: "Unknown problem." }, { status: 404 });
  }

  let messages: UIMessage[];
  try {
    messages = await validateUIMessages<UIMessage>({ messages: body.messages });
  } catch {
    return Response.json({ error: "Invalid chat messages." }, { status: 400 });
  }

  const language = getLanguage(body.language);

  // Without a key the workbench still has to be usable, so serve the scripted
  // tutor through the same streaming protocol.
  if (!process.env.DEEPSEEK_API_KEY) {
    return demoChatResponse(
      buildDemoAnswer({
        question: lastUserText(messages) ?? "",
        problem,
        language,
      }),
      { signal: request.signal },
    );
  }

  const code = truncateForContext(body.code ?? "");
  const instructions = [
    buildTutorInstructions(problem, language),
    "",
    "The user's current editor buffer:",
    "```" + language.monacoId,
    code.text,
    "```",
    code.truncated
      ? "(The buffer was truncated; ask for a specific function if you need the rest.)"
      : "",
    body.runSummary
      ? ["", "Most recent run result in the console:", body.runSummary].join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const result = streamText({
    model: deepseek("deepseek-flash"),
    instructions,
    messages: await convertToModelMessages(messages),
    abortSignal: request.signal,
  });

  return result.toUIMessageStreamResponse();
}
