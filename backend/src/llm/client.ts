/**
 * Shared LLM client — routes through OpenRouter (OpenAI-compatible API).
 * Falls back to direct OpenAI if OPENAI_API_KEY is set instead.
 *
 * With paid OpenRouter key: uses openai/gpt-4o-mini (~$0.10/M tokens)
 * which supports native JSON mode for reliable structured output.
 *
 * Config via env:
 *   OPENROUTER_API_KEY  — OpenRouter key (preferred)
 *   OPENROUTER_MODEL    — model to use (default: openai/gpt-4o-mini)
 *   OPENAI_API_KEY      — fallback: direct OpenAI
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMResponse {
  content: string;
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

function getConfig() {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini';

  if (openrouterKey) {
    return { url: OPENROUTER_URL, key: openrouterKey, model, provider: 'openrouter' as const };
  }
  if (openaiKey) {
    return { url: OPENAI_URL, key: openaiKey, model: 'gpt-4o', provider: 'openai' as const };
  }
  return null;
}

export async function chatCompletion(
  messages: ChatMessage[],
  options: {
    jsonMode?: boolean;
    maxTokens?: number;
    temperature?: number;
  } = {},
): Promise<LLMResponse | null> {
  const config = getConfig();
  if (!config) return null;

  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    max_tokens: options.maxTokens ?? 500,
    temperature: options.temperature ?? 0.3,
  };

  // GPT-4o-mini and most paid models support native JSON mode
  if (options.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.key}`,
  };

  if (config.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://darkpool.trade';
    headers['X-Title'] = 'DarkPool.trade';
  }

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[LLM] ${config.provider}/${config.model} returned ${response.status}: ${errorText.slice(0, 200)}`);
      return null;
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    return {
      content: data.choices[0].message.content,
      model: data.model,
      usage: data.usage,
    };
  } catch (error) {
    console.error('[LLM] Request failed:', error);
    return null;
  }
}

export async function chatCompletionJSON<T>(
  messages: ChatMessage[],
  options: { maxTokens?: number; temperature?: number } = {},
): Promise<T | null> {
  const result = await chatCompletion(messages, { ...options, jsonMode: true });
  if (!result) return null;

  let content = result.content.trim();

  // Safety: strip markdown fences if model wraps JSON (shouldn't happen with json_mode but just in case)
  if (content.startsWith('```')) {
    content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }

  try {
    return JSON.parse(content) as T;
  } catch {
    console.error('[LLM] Failed to parse JSON from', result.model, ':', content.slice(0, 200));
    return null;
  }
}

export function isLLMConfigured(): boolean {
  return getConfig() !== null;
}

export function getLLMProvider(): string {
  const config = getConfig();
  if (!config) return 'none';
  return `${config.provider}/${config.model}`;
}
