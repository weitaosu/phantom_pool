import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { WebSocketServer, type WebSocket } from 'ws';
import { createServer } from 'node:http';

import { OrderBook } from './matching/OrderBook.js';
import { Matcher } from './matching/Matcher.js';
import { Settler } from './chain/Settler.js';
import { AlkahestListener } from './chain/alkahestListener.js';
import { SolanaListener } from './chain/solanaListener.js';
import { IcebergQueue } from './iceberg/IcebergQueue.js';
import { createOrderRoutes } from './routes/orders.js';
import { createMarketRoutes } from './routes/markets.js';
import { x402SolanaMiddleware } from './middleware/x402Solana.js';
import { x402TronMiddleware } from './middleware/x402Tron.js';
import { NewsAgent } from './agent/newsAgent.js';
import { GeminiPriceFeed } from './feeds/geminiPriceFeed.js';
import { AgentStorage } from './filecoin/agentStorage.js';
import { getLLMProvider } from './llm/client.js';
import type { WsEvent } from './types/orders.js';

// ── Config ──────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const ALCHEMY_RPC = process.env.ALCHEMY_RPC_URL ?? 'http://127.0.0.1:8545';
const SOLANA_RPC = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
const ARBITER_ADDRESS = process.env.DARK_POOL_ARBITER_ADDRESS ?? '0x0000000000000000000000000000000000000000';
const ALKAHEST_ADDRESS = process.env.ALKAHEST_ADDRESS ?? '0x0000000000000000000000000000000000000000';
const SOLANA_PROGRAM_ID = process.env.SOLANA_PROGRAM_ID ?? '11111111111111111111111111111111';
const ENGINE_KEY = process.env.MATCHING_ENGINE_PRIVATE_KEY ?? '0x' + '00'.repeat(32);
const POLYMARKET_API_KEY = process.env.POLYMARKET_API_KEY ?? '';
const POLYMARKET_SECRET = process.env.POLYMARKET_SECRET ?? '';
const TRON_HOST = process.env.TRON_FULL_HOST ?? 'https://nile.trongrid.io';
const TRON_RECEIVER = process.env.TRON_RECEIVER_ADDRESS ?? '';
const SOLANA_RECEIVER = process.env.SOLANA_RECEIVER_WALLET ?? '';
const NEWSAPI_KEY = process.env.NEWSAPI_KEY ?? '';

// ── Core Services ───────────────────────────────────────────────

const orderBook = new OrderBook();
const matcher = new Matcher(orderBook);
// Settler needs a valid private key — create lazily only if key is configured
let settler: Settler;
try {
  settler = new Settler(ALCHEMY_RPC, ARBITER_ADDRESS, ENGINE_KEY);
} catch {
  console.warn('[Startup] Settler disabled — MATCHING_ENGINE_PRIVATE_KEY not valid. Matching works but on-chain settlement is off.');
  // Create a dummy settler that logs instead of transacting
  settler = { settleMatch: async () => '', queueSettlement: () => {}, processQueue: async () => [], getPendingCount: () => 0, on: () => settler, emit: () => false } as any;
}
const icebergQueue = new IcebergQueue(POLYMARKET_API_KEY, POLYMARKET_SECRET);

// ── Agent Services (Person 3) ───────────────────────────────────

const newsAgent = new NewsAgent(NEWSAPI_KEY);
const geminiPriceFeed = new GeminiPriceFeed();
const agentStorage = new AgentStorage();

// ── Chain Listeners (only start if addresses configured) ────────

let alkahestListener: AlkahestListener | null = null;
let solanaListener: SolanaListener | null = null;

if (ALKAHEST_ADDRESS && ARBITER_ADDRESS) {
  alkahestListener = new AlkahestListener(ALCHEMY_RPC, ALKAHEST_ADDRESS, ARBITER_ADDRESS);
}
if (SOLANA_PROGRAM_ID) {
  solanaListener = new SolanaListener(SOLANA_RPC, SOLANA_PROGRAM_ID);
}

// ── Express App ─────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    llmProvider: getLLMProvider(),
    orderBookSize: orderBook.getAllOrders().length,
    icebergQueueSize: icebergQueue.getQueueSize(),
    pendingSettlements: settler.getPendingCount(),
    uptime: process.uptime(),
  });
});

// Order routes
app.use('/api/orders', createOrderRoutes({ orderBook, matcher, icebergQueue, settler }));

// Market routes
app.use('/api/markets', createMarketRoutes());

// x402-protected Solana endpoint
if (SOLANA_RECEIVER) {
  app.use('/api/solana/orders/submit', x402SolanaMiddleware({
    receiverWallet: SOLANA_RECEIVER,
    priceUsdc: '0.10',
    network: 'solana-devnet',
    description: 'Dark pool matching engine access — per-order fee',
  }));
}

// x402-protected TRON endpoint
if (TRON_RECEIVER) {
  app.use('/api/tron/orders/submit', x402TronMiddleware({
    receiverAddress: TRON_RECEIVER,
    amountUsdt: '0.10',
    tronFullHost: TRON_HOST,
    memo: 'dark-pool-access',
  }));
}

// Solana and TRON order submission (behind x402 middleware above)
// These reuse the same order routes but tag the chain
const solanaOrderRoutes = createOrderRoutes({ orderBook, matcher, icebergQueue, settler });
const tronOrderRoutes = createOrderRoutes({ orderBook, matcher, icebergQueue, settler });
app.use('/api/solana/orders', solanaOrderRoutes);
app.use('/api/tron/orders', tronOrderRoutes);

// Person 3: AI Agent endpoints
app.get('/api/news/signals', (_req, res) => {
  res.json(newsAgent.getRecentSignals());
});

app.get('/api/gemini/events', async (_req, res) => {
  const events = await geminiPriceFeed.getEvents();
  res.json(geminiPriceFeed.toMarketInfo(events));
});

app.get('/api/gemini/cross-venue', async (_req, res) => {
  try {
    const marketsRes = await fetch('https://gamma-api.polymarket.com/markets?closed=false&limit=100');
    const markets = marketsRes.ok ? await marketsRes.json() as any[] : [];
    const polyMarkets = markets.map((m: any) => ({
      conditionId: m.conditionId, title: m.question,
      yesPrice: JSON.parse(m.outcomePrices ?? '[0.5]')[0] ?? 0.5,
      noPrice: JSON.parse(m.outcomePrices ?? '[0.5,0.5]')[1] ?? 0.5,
      volume24h: m.volume24hr ?? 0, liquidity: m.liquidityNum ?? 0, source: 'polymarket' as const,
    }));
    const arbs = await geminiPriceFeed.detectArbitrage(polyMarkets);
    res.json(arbs);
  } catch {
    res.json([]);
  }
});

app.get('/api/agent/reputation', (_req, res) => {
  res.json(agentStorage.getReputationReport());
});

app.get('/api/agent/memory', (_req, res) => {
  res.json(agentStorage.getAllEntries().slice(-50));
});

// ── WebSocket Server ────────────────────────────────────────────

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
const clients: Set<WebSocket> = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[WS] Client connected (${clients.size} total)`);

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WS] Client disconnected (${clients.size} total)`);
  });
});

function broadcast(event: WsEvent): void {
  // BigInt can't be serialized by JSON.stringify — convert to string
  const payload = JSON.stringify(event, (_key, value) =>
    typeof value === 'bigint' ? value.toString() : value,
  );
  for (const client of clients) {
    if (client.readyState === 1) { // OPEN
      client.send(payload);
    }
  }
}

// ── Wire Events ─────────────────────────────────────────────────

// Alkahest listener → matching engine
alkahestListener?.on('order', (order) => {
  console.log(`[Pipeline] New order from Alkahest: ${order.orderId}`);
  const matches = matcher.submitAndMatch(order);

  for (const match of matches) {
    settler.queueSettlement(match);
    broadcast({ type: 'order.matched', data: { pairId: match.pairId, market: match.market }, timestamp: Date.now() });
  }

  if (matches.length > 0) {
    settler.processQueue().catch(console.error);
  }

  broadcast({ type: 'order.revealed', data: { orderId: order.orderId, market: order.market }, timestamp: Date.now() });
});

// Matcher events
matcher.on('match', (match) => {
  console.log(`[Pipeline] Match found: ${match.pairId}`);
  broadcast({ type: 'order.matched', data: match, timestamp: Date.now() });
});

matcher.on('partial-fill', (order, matchedSize) => {
  // Queue remaining size for iceberg execution
  const residual = { ...order, sizeUsdc: order.sizeUsdc };
  icebergQueue.enqueue(residual);
});

// Settler events
settler.on('settled', ({ pairId, txHash }) => {
  console.log(`[Pipeline] Settled: ${pairId} tx=${txHash}`);
  broadcast({ type: 'order.settled', data: { pairId, txHash }, timestamp: Date.now() });
});

// Iceberg events
icebergQueue.on('slice-filled', (data) => {
  broadcast({ type: 'iceberg.slice', data, timestamp: Date.now() });
});

icebergQueue.on('complete', (data) => {
  broadcast({ type: 'iceberg.complete', data, timestamp: Date.now() });
});

// ── News Agent Events ───────────────────────────────────────

newsAgent.on('signal', async (signal) => {
  broadcast({ type: 'news.signal', data: signal as any, timestamp: Date.now() });
  await agentStorage.storeMemory(signal);
});

// ── Start ───────────────────────────────────────────────────────

async function start(): Promise<void> {
  // Start chain listeners (will silently fail if contracts not deployed yet)
  if (alkahestListener) {
    try { await alkahestListener.start(); }
    catch (err) { console.warn('[Startup] Alkahest listener failed:', (err as Error).message); }
  } else {
    console.log('[Startup] Alkahest listener skipped — ALKAHEST_ADDRESS not set');
  }

  if (solanaListener) {
    try { await solanaListener.start(); }
    catch (err) { console.warn('[Startup] Solana listener failed:', (err as Error).message); }
  } else {
    console.log('[Startup] Solana listener skipped — SOLANA_PROGRAM_ID not set');
  }

  // Start agent services
  await agentStorage.initialize();
  await agentStorage.registerAgent({ chains: ['polygon', 'solana', 'tron'] });

  // Seed demo memory entries for reputation display
  await agentStorage.storeMemory(
    { articleTitle: 'Fed signals rate cut', articleUrl: '', affectedMarket: 'fed rate cut', currentPrice: 0.60, estimatedProb: 0.72, edge: 0.12, confidence: 75, action: 'BUY_YES', timestamp: Date.now() - 3600_000 },
    { actualProb: 0.71, pnl: 42.50 },
  );
  await agentStorage.storeMemory(
    { articleTitle: 'BTC institutional buying surge', articleUrl: '', affectedMarket: 'btc 100k', currentPrice: 0.40, estimatedProb: 0.55, edge: 0.15, confidence: 68, action: 'BUY_YES', timestamp: Date.now() - 1800_000 },
    { actualProb: 0.52, pnl: 31.20 },
  );
  await agentStorage.storeMemory(
    { articleTitle: 'EU crypto regulation passes', articleUrl: '', affectedMarket: 'eth 5k', currentPrice: 0.22, estimatedProb: 0.15, edge: 0.07, confidence: 55, action: 'BUY_NO', timestamp: Date.now() - 900_000 },
    { actualProb: 0.18, pnl: -8.40 },
  );
  newsAgent.start(120_000).catch(console.warn); // Poll every 2min

  httpServer.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║  DarkPool.trade — Backend Server                     ║
║  Port: ${PORT}                                          ║
║  WebSocket: ws://localhost:${PORT}/ws                    ║
║                                                      ║
║  Endpoints:                                          ║
║    POST /api/orders/submit     — Submit order        ║
║    POST /api/orders/reveal     — Reveal commitment   ║
║    GET  /api/orders/:id        — Order status        ║
║    GET  /api/orders?trader=    — Trader's orders     ║
║    GET  /api/markets           — Browse markets      ║
║    GET  /health                — Health check        ║
║                                                      ║
║  x402 endpoints (payment required):                  ║
║    POST /api/solana/orders/submit                    ║
║    POST /api/tron/orders/submit                      ║
╚══════════════════════════════════════════════════════╝
    `);
  });
}

start().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Shutdown] Received SIGTERM');
  await alkahestListener?.stop();
  await solanaListener?.stop();
  icebergQueue.shutdown();
  httpServer.close();
  process.exit(0);
});
