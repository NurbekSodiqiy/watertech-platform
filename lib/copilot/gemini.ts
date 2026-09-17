import "server-only";
import { ApiError, GoogleGenAI, type Content, type GenerateContentConfig } from "@google/genai";
import type { CopilotHistoryTurn } from "@/lib/copilot/schema";

export type CopilotUpstreamReason = "rate_limited" | "upstream";

export class CopilotUpstreamError extends Error {
  constructor(readonly reason: CopilotUpstreamReason) {
    super(`copilot upstream error: ${reason}`);
    this.name = "CopilotUpstreamError";
  }
}

/** Last item of streamAnswer(): how Gemini ended the answer (STOP,
 * MAX_TOKENS, SAFETY, …), or null if it never said. */
export interface StreamDone {
  done: true;
  finishReason: string | null;
}

export interface StreamAnswerParams {
  apiKey: string;
  model: string;
  system: string;
  history: CopilotHistoryTurn[];
  user: string;
  signal?: AbortSignal;
}

// One client per process, recreated only if the key changes (it doesn't,
// short of a restart — but a stale key must never be reused silently).
let client: { apiKey: string; ai: GoogleGenAI } | undefined;

function getClient(apiKey: string): GoogleGenAI {
  if (!client || client.apiKey !== apiKey) {
    client = { apiKey, ai: new GoogleGenAI({ apiKey }) };
  }
  return client.ai;
}

function toUpstreamError(error: unknown): CopilotUpstreamError {
  if (error instanceof CopilotUpstreamError) return error;
  const rateLimited =
    (error instanceof ApiError && error.status === 429) ||
    (error instanceof Error && error.message.includes("RESOURCE_EXHAUSTED"));
  return new CopilotUpstreamError(rateLimited ? "rate_limited" : "upstream");
}

export async function* streamAnswer({
  apiKey,
  model,
  system,
  history,
  user,
  signal,
}: StreamAnswerParams): AsyncGenerator<string | StreamDone> {
  const contents: Content[] = [
    ...history.map((turn) => ({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.content }],
    })),
    { role: "user", parts: [{ text: user }] },
  ];

  const config: GenerateContentConfig = {
    systemInstruction: system,
    maxOutputTokens: 500,
    temperature: 0.2,
    // safetySettings deliberately omitted: Gemini's defaults apply.
    abortSignal: signal,
    // 2.5 Flash "thinks" by default, and thinking tokens count against
    // maxOutputTokens — a 500-token cap could be spent before any answer text
    // (finishReason MAX_TOKENS, empty reply). Grounded short answers don't
    // need it. Pro models can't disable thinking, so only Flash gets this.
    ...(model.includes("flash") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
  };

  let finishReason: string | null = null;
  try {
    const stream = await getClient(apiKey).models.generateContentStream({ model, contents, config });
    for await (const chunk of stream) {
      const reason = chunk.candidates?.[0]?.finishReason;
      if (reason) finishReason = reason;
      const text = chunk.text;
      if (text) yield text;
    }
  } catch (error) {
    throw toUpstreamError(error);
  }

  yield { done: true, finishReason };
}
