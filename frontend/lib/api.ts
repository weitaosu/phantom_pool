// Typed API client for the Phantom Pool backend
// All calls gracefully fall back if the backend is unreachable.

const BASE = (typeof window !== "undefined"
  ? process.env.NEXT_PUBLIC_API_URL
  : process.env.NEXT_PUBLIC_API_URL) ?? "http://localhost:3001";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MarketInfo {
  conditionId: string;
  title: string;
  yesPrice: number;
  noPrice: number;
  volume24h: number;
  liquidity: number;
  source: "polymarket" | "gemini" | "dflow";
}

export interface NewsSignal {
  articleTitle: string;
  articleUrl: string;
  affectedMarket: string;
  currentPrice: number;
  estimatedProb: number;
  edge: number;
  confidence: number;
  action: "BUY_YES" | "BUY_NO" | "HOLD";
  timestamp: number;
}

export interface CrossVenueArbitrage {
  market: string;
  polymarketPrice: number;
  geminiPrice: number;
  spread: number;
  direction: string;
}

export interface OrderSubmitRequest {
  commitHash: string;
  traderAddress: string;
  market?: string;
  isYes?: boolean;
  sizeUsdc?: string; // stringified bigint
  limitPriceBps?: number;
  expiryTimestamp?: number;
  salt?: string;
  chain?: string;
}

export interface OrderSubmitResponse {
  orderId: string;
  state: string;
  txHash?: string;
  estimatedMatchTime?: number;
}

export interface RevealRequest {
  orderId: string;
  market: string;
  isYes: boolean;
  sizeUsdc: string; // stringified bigint
  limitPriceBps: number;
  expiryTimestamp: number;
  salt: string;
}

export interface RevealResponse {
  orderId: string;
  state: string;
  matchesFound: number;
  matches: unknown[];
}

export interface OrderStatusResponse {
  orderId: string;
  state: string;
  matchedSize?: string;
  matchedPrice?: number;
  icebergProgress?: {
    total: number;
    completed: number;
    executedUsdc: string;
  };
}

export interface HealthResponse {
  status: string;
  llmProvider: string;
  orderBookSize: number;
  icebergQueueSize: number;
  pendingSettlements: number;
  uptime: number;
}

export interface ReputationReport {
  agentId: string;
  accuracy: number;
  totalTrades: number;
  correctPredictions: number;
  cids: string[];
  storageBackend: string;
}

export interface MemoryEntry {
  cid: string;
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface OrderBookDepth {
  market: string;
  buyOrders: number;
  sellOrders: number;
  estimatedBuyPressure: "HIGH" | "LOW";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

async function post<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      // Return the raw response body as a special error shape
      const errBody = await res.json().catch(() => ({}));
      return { _httpStatus: res.status, ...errBody } as T;
    }
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function getMarkets(): Promise<MarketInfo[]> {
  return (await get<MarketInfo[]>("/api/markets")) ?? [];
}

export async function getGeminiMarkets(): Promise<MarketInfo[]> {
  return (await get<MarketInfo[]>("/api/gemini/events")) ?? [];
}

export async function getCrossVenueArb(): Promise<CrossVenueArbitrage[]> {
  return (await get<CrossVenueArbitrage[]>("/api/gemini/cross-venue")) ?? [];
}

export async function getNewsSignals(): Promise<NewsSignal[]> {
  return (await get<NewsSignal[]>("/api/news/signals")) ?? [];
}

export async function getHealth(): Promise<HealthResponse | null> {
  return get<HealthResponse>("/health");
}

export async function submitOrder(req: OrderSubmitRequest): Promise<OrderSubmitResponse & { _httpStatus?: number } | null> {
  return post<OrderSubmitResponse & { _httpStatus?: number }>("/api/orders/submit", req);
}

export async function revealOrder(req: RevealRequest): Promise<RevealResponse & { _httpStatus?: number } | null> {
  return post<RevealResponse & { _httpStatus?: number }>("/api/orders/reveal", req);
}

export async function getOrderStatus(orderId: string): Promise<OrderStatusResponse | null> {
  return get<OrderStatusResponse>(`/api/orders/${orderId}`);
}

export async function getAgentReputation(): Promise<ReputationReport | null> {
  return get<ReputationReport>("/api/agent/reputation");
}

export async function getAgentMemory(): Promise<MemoryEntry[]> {
  return (await get<MemoryEntry[]>("/api/agent/memory")) ?? [];
}

export async function getOrderBook(market: string): Promise<OrderBookDepth | null> {
  return get<OrderBookDepth>(`/api/orders/orderbook/${encodeURIComponent(market)}`);
}

// ─── x402 TRON submit (returns raw response for 402 handling) ─────────────────

export async function submitTronOrder(
  body: unknown,
  paymentTxHash?: string
): Promise<{ status: number; data: unknown }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (paymentTxHash) headers["X-Tron-Payment-TxHash"] = paymentTxHash;
  try {
    const res = await fetch(`${BASE}/api/tron/orders/submit`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  } catch {
    return { status: 0, data: { error: "Network error" } };
  }
}
