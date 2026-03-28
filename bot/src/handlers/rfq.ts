import type { Context } from 'grammy';
import { extractOrderIntent, type OrderIntent } from '../ai/intentExtractor.js';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

// Pending confirmations per chat
const pendingOrders: Map<number, OrderIntent & { marketTitle?: string; marketPrice?: number }> = new Map();

export async function handleMessage(ctx: Context): Promise<void> {
  const text = ctx.message?.text;
  if (!text) return;

  // Check for pending confirmation
  const chatId = ctx.chat?.id;
  if (chatId && pendingOrders.has(chatId)) {
    const lower = text.toLowerCase();
    if (lower === 'yes' || lower === 'confirm' || lower === 'y') {
      await confirmOrder(ctx, pendingOrders.get(chatId)!);
      pendingOrders.delete(chatId);
      return;
    } else if (lower === 'no' || lower === 'cancel' || lower === 'n') {
      pendingOrders.delete(chatId);
      await ctx.reply('Order cancelled.');
      return;
    }
    // If they modify (e.g. "yes but limit at 63 cents"), re-parse
    if (lower.includes('but') || lower.includes('limit')) {
      const intent = await extractOrderIntent(text);
      const prev = pendingOrders.get(chatId)!;
      if (intent.limit_price_cents) prev.limit_price_cents = intent.limit_price_cents;
      if (intent.size_usdc) prev.size_usdc = intent.size_usdc;
      await showConfirmation(ctx, prev);
      return;
    }
  }

  const intent = await extractOrderIntent(text);

  switch (intent.action) {
    case 'buy':
    case 'sell':
      await handleTradeIntent(ctx, intent);
      break;
    case 'status':
      await handleStatus(ctx);
      break;
    case 'info':
      await handleMarketInfo(ctx, intent.market_query);
      break;
    case 'cancel':
      await ctx.reply('Send the order ID to cancel: /cancel <orderId>');
      break;
    case 'help':
      await showHelp(ctx);
      break;
    default:
      await ctx.reply(
        "I'm not sure what you'd like to do. Try:\n" +
        '• "Buy 1000 USDC of YES on Fed rate cut"\n' +
        '• "What\'s the price on the BTC 100k market?"\n' +
        '• /status to see your orders\n' +
        '• /help for all commands',
      );
  }
}

async function handleTradeIntent(ctx: Context, intent: OrderIntent): Promise<void> {
  // Clean the market query — extract just the market name, not the whole message
  const rawQuery = intent.market_query ?? '';
  // Remove everything up to and including the last "on the" / "on" / "for" / "of"
  // "buy 5000 of yes on the btc 100k market" → "btc 100k"
  const cleanedQuery = rawQuery
    .replace(/^.*\bon\s+the\s+/i, '')       // greedy: removes up to last "on the"
    .replace(/^.*\b(?:on|for)\s+/i, '')      // then try "on" or "for"
    .replace(/\s*market\s*$/i, '')            // strip trailing "market"
    .replace(/^(?:yes|no)\s+(?:on\s+)?/i, '') // strip leading "yes on" / "no on"
    .trim() || rawQuery;

  let marketTitle = cleanedQuery;
  let marketPrice = 0.5;

  // Try to match against Polymarket API
  try {
    const res = await fetch(`${API_URL}/api/markets`);
    if (res.ok) {
      const markets = await res.json() as Array<{ conditionId: string; title: string; yesPrice: number }>;
      const match = markets.find(m =>
        m.title.toLowerCase().includes(cleanedQuery.toLowerCase().slice(0, 20)),
      );
      if (match) {
        marketTitle = match.title;
        marketPrice = parseFloat(String(match.yesPrice)) || 0.5;
      }
    }
  } catch { /* use defaults */ }

  // If no Polymarket match, use the cleaned query directly (matches seeded orders)
  const enriched = { ...intent, marketTitle, marketPrice };
  pendingOrders.set(ctx.chat!.id, enriched);
  await showConfirmation(ctx, enriched);
}

async function showConfirmation(
  ctx: Context,
  intent: OrderIntent & { marketTitle?: string; marketPrice?: number },
): Promise<void> {
  const side = intent.side?.toUpperCase() ?? 'YES';
  const action = intent.action?.toUpperCase() ?? 'BUY';
  const size = intent.size_usdc ?? 100;
  const limit = intent.limit_price_cents
    ? `${intent.limit_price_cents}¢`
    : `auto (~${Math.round((intent.marketPrice ?? 0.5) * 100 + 2)}¢)`;

  await ctx.reply(
    `📋 *Order Summary*\n\n` +
    `Market: ${intent.marketTitle}\n` +
    `Current price: ${Math.round((intent.marketPrice ?? 0.5) * 100)}¢/share\n` +
    `Action: ${action} ${side}\n` +
    `Size: $${size.toLocaleString()} USDC\n` +
    `Limit: ${limit}\n\n` +
    `🔒 Your order will be committed privately.\n` +
    `No size or direction visible on-chain.\n\n` +
    `Reply *YES* to confirm, or modify any field.`,
    { parse_mode: 'Markdown' },
  );
}

async function confirmOrder(
  ctx: Context,
  intent: OrderIntent & { marketTitle?: string; marketPrice?: number },
): Promise<void> {
  const size = intent.size_usdc ?? 100;
  const limitBps = intent.limit_price_cents
    ? intent.limit_price_cents * 100
    : Math.round((intent.marketPrice ?? 0.5) * 10000 + 200);

  try {
    const res = await fetch(`${API_URL}/api/orders/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commitHash: '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join(''),
        traderAddress: `telegram:${ctx.from?.id}`,
        chain: 'polygon',
        market: intent.marketTitle ?? intent.market_query ?? 'unknown',
        isYes: intent.side !== 'no',
        sizeUsdc: (size * 1_000_000).toString(), // $size → USDC 6-decimal
        limitPriceBps: limitBps,
        expiryTimestamp: Math.floor(Date.now() / 1000) + 600,
      }),
    });

    if (!res.ok) {
      await ctx.reply('❌ Failed to submit order. Please try again.');
      return;
    }

    const result = await res.json() as { orderId: string };
    await ctx.reply(
      `✅ *Order committed to dark pool!*\n\n` +
      `Order ID: \`${result.orderId}\`\n` +
      `Searching for match... (up to 10 min)\n\n` +
      `I'll notify you when:\n` +
      `• A match is found\n` +
      `• Iceberg execution begins\n` +
      `• Settlement is complete`,
      { parse_mode: 'Markdown' },
    );
  } catch (error) {
    await ctx.reply('❌ Error connecting to dark pool. Is the backend running?');
  }
}

async function handleStatus(ctx: Context): Promise<void> {
  try {
    const traderId = `telegram:${ctx.from?.id}`;
    const res = await fetch(`${API_URL}/api/orders?trader=${encodeURIComponent(traderId)}`);
    if (!res.ok) {
      await ctx.reply('Could not fetch orders.');
      return;
    }

    const orders = await res.json() as Array<{
      orderId: string; market: string; isYes: boolean;
      sizeUsdc: string; limitPriceBps: number; state: string;
    }>;

    if (orders.length === 0) {
      await ctx.reply('📊 No active dark pool orders.');
      return;
    }

    const lines = orders.slice(0, 5).map((o, i) => {
      const side = o.isYes ? 'YES' : 'NO';
      const size = (parseInt(o.sizeUsdc) / 1_000_000).toLocaleString();
      const price = (o.limitPriceBps / 100).toFixed(0);
      const stateEmoji = { REVEALED: '🔍', MATCHED: '✅', ICEBERG: '📊', SETTLED: '💰', COMMITTED: '⏳' }[o.state] ?? '❓';
      return `#${i + 1} ${stateEmoji} ${side} $${size} @ ≤${price}¢\n   Market: ${o.market?.slice(0, 30) ?? 'Unknown'}\n   Status: ${o.state}`;
    });

    await ctx.reply(`📊 *Your Dark Pool Orders:*\n\n${lines.join('\n\n')}`, { parse_mode: 'Markdown' });
  } catch {
    await ctx.reply('Error fetching orders.');
  }
}

async function handleMarketInfo(ctx: Context, query: string | null): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/api/markets`);
    if (!res.ok) { await ctx.reply('Could not fetch markets.'); return; }

    const markets = await res.json() as Array<{ title: string; yesPrice: number; noPrice: number; volume24h: number }>;
    const match = query
      ? markets.find(m => m.title.toLowerCase().includes(query.toLowerCase().slice(0, 20)))
      : markets[0];

    if (!match) {
      await ctx.reply(`No market found for "${query}". Try /markets to browse.`);
      return;
    }

    await ctx.reply(
      `📈 *${match.title}*\n\n` +
      `YES: ${Math.round(match.yesPrice * 100)}¢\n` +
      `NO: ${Math.round(match.noPrice * 100)}¢\n` +
      `24h Volume: $${(match.volume24h / 1_000_000).toFixed(1)}M\n\n` +
      `Want to trade? Just tell me what you'd like to do.`,
      { parse_mode: 'Markdown' },
    );
  } catch {
    await ctx.reply('Error fetching market data.');
  }
}

async function showHelp(ctx: Context): Promise<void> {
  await ctx.reply(
    `🐙 *DarkPool.trade Bot*\n\n` +
    `*Trading (natural language):*\n` +
    `• "Buy 10k of yes on Trump 2028"\n` +
    `• "Sell 500 USDC of no on Fed rate cut"\n\n` +
    `*Commands:*\n` +
    `/status — View active orders\n` +
    `/markets — Browse markets\n` +
    `/cancel <id> — Cancel order\n` +
    `/help — This message\n\n` +
    `Your orders are committed privately — no size or direction visible on-chain.`,
    { parse_mode: 'Markdown' },
  );
}
