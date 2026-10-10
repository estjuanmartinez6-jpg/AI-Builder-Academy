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
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await askOnce(system, prompt);
    } catch (e) {
      last = e;
      console.error("[askClaude] attempt", attempt + 1, "failed:", (e as Error).message);
      if ((e as Error).message === "CREDITS") break;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw last;
}

async function askOnce(system: string, prompt: string): Promise<string> {
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
  let text = "";
  let finish: unknown = "";
  try {
    text = await result.text;
    finish = await result.finishReason;
  } catch (e) {
    failure ??= e;
  }
  if (failure) {
    console.error("[askClaude] provider error:", (failure as Error)?.message ?? failure);
    const f = failure as { statusCode?: number; cause?: { statusCode?: number }; message?: string };
    const status = f.statusCode ?? f.cause?.statusCode ?? (/credits|payment/i.test(f.message ?? "") ? 402 : undefined);
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
