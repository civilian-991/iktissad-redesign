/**
 * Vercel AI Gateway client — one OpenAI-compatible door to 283 models
 * (plan v4 §2.5). Model-agnostic, OpenAI-first, tier-split for cost
 * (research appendix §6/§8/§9: cheap model for grunt work, strong for prose).
 *
 * Every call records token usage + cost shape so it can be shipped to Langfuse
 * and the gcc_agent_runs ledger. The wrapper is framework-agnostic so n8n (via
 * an API route) or a server job can use it identically.
 */

const GATEWAY_URL =
  process.env.AI_GATEWAY_URL ?? 'https://ai-gateway.vercel.sh/v1/chat/completions';

/** Logical roles → model ids. Override per-role via env without code changes. */
export type ModelTier = 'reasoning' | 'strong' | 'writer' | 'cheap' | 'classify';

const DEFAULT_MODELS: Record<ModelTier, string> = {
  reasoning: process.env.GCC_MODEL_REASONING ?? 'openai/gpt-5.1-thinking',
  strong: process.env.GCC_MODEL_STRONG ?? 'openai/gpt-5.4',
  // Writer runs in the synchronous request the editor waits on, so it must be a
  // FAST strong model — reasoning models (gpt-5.4-pro) are too slow here and the
  // gateway connection drops (~200s). Override via GCC_MODEL_WRITER for offline
  // high-value pieces if desired.
  writer: process.env.GCC_MODEL_WRITER ?? 'openai/gpt-5.4',
  cheap: process.env.GCC_MODEL_CHEAP ?? 'openai/gpt-5.4-mini',
  classify: process.env.GCC_MODEL_CLASSIFY ?? 'openai/gpt-5.4-nano',
};

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionResult {
  text: string;
  model: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  /** ms */
  latency: number;
}

export interface CompletionOptions {
  tier?: ModelTier;
  model?: string; // explicit override beats tier
  temperature?: number;
  maxTokens?: number;
  /** Force a JSON object response when the provider supports it. */
  json?: boolean;
  signal?: AbortSignal;
}

function resolveModel(opts: CompletionOptions): string {
  if (opts.model) return opts.model;
  return DEFAULT_MODELS[opts.tier ?? 'strong'];
}

/**
 * Single chat completion through the gateway. Throws on non-2xx so callers can
 * fall back deterministically (research appendix §4: every external call has a
 * deterministic fallback).
 */
export async function complete(messages: ChatMessage[], opts: CompletionOptions = {}): Promise<CompletionResult> {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) throw new Error('AI_GATEWAY_API_KEY is not set');

  const model = resolveModel(opts);
  const started = Date.now();

  const post = (useJson: boolean) =>
    fetch(GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: opts.signal,
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.temperature ?? 0.3,
        ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
        ...(useJson ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

  let res = await post(!!opts.json);

  // Some models (e.g. gpt-5.4-pro) reject response_format. Retry without it —
  // parseJsonObject still extracts the JSON, and every prompt asks for JSON only.
  if (!res.ok && opts.json && res.status === 400) {
    const peek = await res.clone().text().catch(() => '');
    if (peek.includes('response_format')) {
      res = await post(false);
    }
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`AI Gateway ${model} → HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text: string = data.choices?.[0]?.message?.content ?? '';
  const u = data.usage ?? {};
  return {
    text,
    model,
    usage: {
      promptTokens: u.prompt_tokens ?? 0,
      completionTokens: u.completion_tokens ?? 0,
      totalTokens: u.total_tokens ?? 0,
    },
    latency: Date.now() - started,
  };
}

/** Parse a JSON object from a model response, tolerating ```json fences / prose. */
export function parseJsonObject<T = unknown>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
