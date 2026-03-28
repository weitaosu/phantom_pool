/**
 * Order intent extraction — uses OpenRouter (or OpenAI fallback) via shared config.
 * Falls back to keyword parser if no LLM is configured.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

export interface OrderIntent {
  action: 'buy' | 'sell' | 'status' | 'cancel' | 'info' | 'help' | 'unknown';
  market_query: string | null;
  side: 'yes' | 'no' | null;
  size_usdc: number | null;
  limit_price_cents: number | null;
  urgency: 'normal' | 'urgent';
}

function getLLMConfig() {
  const orKey = process.env.OPENROUTER_API_KEY;
  const oaiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini';

  if (orKey) return { url: OPENROUTER_URL, key: orKey, model, provider: 'openrouter' };
  if (oaiKey) return { url: OPENAI_URL, key: oaiKey, model: 'gpt-4o', provider: 'openai' };
  return null;
}

export async function extractOrderIntent(message: string): Promise<OrderIntent> {
  const config = getLLMConfig();
  if (!config) return parseBasicIntent(message);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.key}`,
    };
    if (config.provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://darkpool.trade';
      headers['X-Title'] = 'DarkPool.trade Bot';
    }

    const response = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: [{
          role: 'system',
          content: `You are an order intake assistant for a prediction market dark pool.
Extract trading intent from natural language. Return JSON:
{
  "action": "buy" | "sell" | "status" | "cancel" | "info" | "help" | "unknown",
  "market_query": string or null (search term for the market),
  "side": "yes" | "no" | null,
  "size_usdc": number or null (dollar amount),
  "limit_price_cents": number or null (in cents, e.g. 63 for 63c),
  "urgency": "normal" | "urgent"
}
If any field cannot be determined, set to null. Be conservative.`,
        }, {
          role: 'user',
          content: message,
        }],
        response_format: { type: 'json_object' },
        max_tokens: 200,
      }),
    });

    if (!response.ok) return parseBasicIntent(message);
    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    let content = data.choices[0].message.content.trim();
    // Strip markdown fences if present
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }
    // Extract JSON object
    const first = content.indexOf('{');
    const last = content.lastIndexOf('}');
    if (first !== -1 && last > first) content = content.slice(first, last + 1);
    return JSON.parse(content);
  } catch {
    return parseBasicIntent(message);
  }
}

function parseBasicIntent(message: string): OrderIntent {
  const lower = message.toLowerCase();

  if (lower.includes('/status') || lower === 'status') {
    return { action: 'status', market_query: null, side: null, size_usdc: null, limit_price_cents: null, urgency: 'normal' };
  }
  if (lower.includes('/cancel')) {
    return { action: 'cancel', market_query: null, side: null, size_usdc: null, limit_price_cents: null, urgency: 'normal' };
  }
  if (lower.includes('/help') || lower === 'help') {
    return { action: 'help', market_query: null, side: null, size_usdc: null, limit_price_cents: null, urgency: 'normal' };
  }
  if (lower.includes('price') || lower.startsWith('what') || lower.includes('how much')) {
    const query = message.replace(/.*(?:price|what|how much).*(?:on|for|of)\s*/i, '').trim();
    return { action: 'info', market_query: query || null, side: null, size_usdc: null, limit_price_cents: null, urgency: 'normal' };
  }

  const buyMatch = lower.match(/buy\s+(\d+)\s*(?:k|usd|usdc|\$)?\s*(?:of\s+)?(yes|no)?/);
  const sellMatch = lower.match(/sell\s+(\d+)\s*(?:k|usd|usdc|\$)?\s*(?:of\s+)?(yes|no)?/);

  if (buyMatch) {
    let size = parseInt(buyMatch[1]);
    if (lower.includes('k')) size *= 1000;
    return { action: 'buy', market_query: message, side: (buyMatch[2] as 'yes' | 'no') ?? 'yes', size_usdc: size, limit_price_cents: null, urgency: 'normal' };
  }
  if (sellMatch) {
    let size = parseInt(sellMatch[1]);
    if (lower.includes('k')) size *= 1000;
    return { action: 'sell', market_query: message, side: (sellMatch[2] as 'yes' | 'no') ?? 'yes', size_usdc: size, limit_price_cents: null, urgency: 'normal' };
  }

  return { action: 'unknown', market_query: message, side: null, size_usdc: null, limit_price_cents: null, urgency: 'normal' };
}
