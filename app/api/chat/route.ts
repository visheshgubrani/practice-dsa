import { executeChatTurn } from "@/lib/chat/turn";
import {
  chatGetQuerySchema,
  chatPostBodySchema,
  ChatNotFoundError,
  ChatThreadMismatchError,
  getChatWorkspace,
} from "@/lib/db/queries/chat";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = chatGetQuerySchema.safeParse({
    slug: url.searchParams.get("slug") ?? undefined,
    threadId: url.searchParams.get("threadId") ?? undefined,
  });
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid chat query.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const state = await getChatWorkspace(parsed.data.slug, parsed.data.threadId);
    if (!state) {
      return Response.json({ error: "Unknown problem." }, { status: 404 });
    }
    return Response.json(state);
  } catch (error) {
    if (
      error instanceof ChatNotFoundError ||
      error instanceof ChatThreadMismatchError
    ) {
      return Response.json({ error: error.message }, { status: 404 });
    }
    const message =
      error instanceof Error ? error.message : "Could not load conversations.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: ReturnType<typeof chatPostBodySchema.parse>;
  try {
    body = chatPostBodySchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid chat request." }, { status: 400 });
  }

  return executeChatTurn({
    body,
    signal: request.signal,
    live: Boolean(process.env.DEEPSEEK_API_KEY),
  });
}
