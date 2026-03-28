import 'dotenv/config';
import { Bot } from 'grammy';
import { handleMessage } from './handlers/rfq.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
const API_URL = process.env.API_URL ?? 'http://localhost:3001';

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN not set. Set it in .env or environment.');
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

// Commands
bot.command('start', (ctx) =>
  ctx.reply(
    '🐙 *Welcome to DarkPool.trade!*\n\n' +
    'I help you trade prediction markets privately.\n\n' +
    'Just tell me what you want to trade in plain English:\n' +
    '• "Buy 1000 USDC of YES on Fed rate cut"\n' +
    '• "What\'s the price on BTC 100k?"\n\n' +
    'Your orders go through our dark pool first — no price impact, no front-running.\n\n' +
    'Type /help for all commands.',
    { parse_mode: 'Markdown' },
  ),
);

bot.command('help', (ctx) =>
  ctx.reply(
    '🐙 *DarkPool.trade Commands*\n\n' +
    '/start — Welcome\n' +
    '/status — View your active orders\n' +
    '/markets — Browse available markets\n' +
    '/cancel <id> — Cancel an order\n' +
    '/help — This message\n\n' +
    'Or just describe your trade in natural language!',
    { parse_mode: 'Markdown' },
  ),
);

bot.command('status', async (ctx) => {
  const traderId = `telegram:${ctx.from?.id}`;
  try {
    const res = await fetch(`${API_URL}/api/orders?trader=${encodeURIComponent(traderId)}`);
    const orders = await res.json() as any[];
    if (orders.length === 0) {
      await ctx.reply('No active orders.');
      return;
    }
    const text = orders.slice(0, 5).map((o: any, i: number) =>
      `${i + 1}. ${o.isYes ? 'BUY YES' : 'BUY NO'} $${(parseInt(o.sizeUsdc) / 1e6).toFixed(0)} — ${o.state}`,
    ).join('\n');
    await ctx.reply(`📊 *Your Orders:*\n\n${text}`, { parse_mode: 'Markdown' });
  } catch {
    await ctx.reply('Error fetching orders.');
  }
});

bot.command('markets', async (ctx) => {
  try {
    const res = await fetch(`${API_URL}/api/markets`);
    const markets = await res.json() as any[];
    const text = markets.slice(0, 8).map((m: any) =>
      `• ${m.title}\n  YES: ${Math.round(m.yesPrice * 100)}¢ | Vol: $${(m.volume24h / 1e6).toFixed(1)}M`,
    ).join('\n\n');
    await ctx.reply(`📈 *Active Markets:*\n\n${text}`, { parse_mode: 'Markdown' });
  } catch {
    await ctx.reply('Error fetching markets.');
  }
});

// Handle all text messages through the RFQ handler
bot.on('message:text', handleMessage);

// Start
bot.start({
  onStart: () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║  DarkPool.trade — Telegram Bot                       ║
║  Bot started successfully                            ║
║  API: ${API_URL.padEnd(45)}║
╚══════════════════════════════════════════════════════╝
    `);
  },
});

// Graceful shutdown
process.on('SIGTERM', () => bot.stop());
process.on('SIGINT', () => bot.stop());
