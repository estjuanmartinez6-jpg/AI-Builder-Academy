import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";

const RUN = "X-Lovable-AIG-Run-ID";
function runIdFetch() {
  let runId: string | undefined;
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (runId && !headers.has(RUN)) headers.set(RUN, runId);
    const res = await fetch(input, { ...init, headers });
    runId ??= res.headers.get(RUN)?.trim() || undefined;
    return res;
  };
}

export async function askClaude(system: string, prompt: string): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured.");
  const anthropic = createAnthropic({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch(),
  });
  let failure: unknown;
  const result = streamText({
    model: anthropic("anthropic/claude-sonnet-5"),
    maxOutputTokens: 8000,
    maxRetries: 0,
    system,
    prompt,
    onError: ({ error }) => {
      failure = error;
    },
  });
  const text = await result.text;
  const finish = await result.finishReason;
  if (failure) {
    const status = (failure as { statusCode?: number }).statusCode;
    if (status === 429) throw new Error("RATE_LIMIT");
    if (status === 402 || status === 403) throw new Error("CREDITS");
    throw new Error("AI_ERROR");
  }
  if (!text.trim() || (finish as string) === "content-filter") throw new Error("AI_ERROR");
  return text;
}

export function extractJson<T>(text: string): T {
  const start = text.search(/[[{]/);
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (start < 0 || end < 0) throw new Error("AI_ERROR");
  return JSON.parse(text.slice(start, end + 1)) as T;
}
