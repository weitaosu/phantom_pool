// ============================================================
// SHARED TYPE DEFINITIONS — Person 2 owns, all others import
// ============================================================

export enum OrderState {
  PENDING_COMMIT = 'PENDING_COMMIT',
  COMMITTED = 'COMMITTED',
  PENDING_REVEAL = 'PENDING_REVEAL',
  REVEALED = 'REVEALED',
  MATCHING = 'MATCHING',
  MATCHED = 'MATCHED',
  SETTLING = 'SETTLING',
  SETTLED = 'SETTLED',
  ICEBERG = 'ICEBERG',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum Chain {
  POLYGON = 'polygon',
  SOLANA = 'solana',
  TRON = 'tron',
}

export interface DarkPoolOrder {
  // Identifiers
  orderId: string;
  commitHash: string;

  // Order details
  market: string;        // Market address or condition ID
  marketName?: string;   // Human-readable name
  isYes: boolean;
  sizeUsdc: bigint;      // USDC amount (6 decimals)
  limitPriceBps: number; // 0-10000 basis points of $1
  expiryTimestamp: number;
  salt: string;

  // Chain
  chain: Chain;
  escrowId?: string;     // Alkahest escrow ID (Polygon) or PDA (Solana)

  // Execution state
  state: OrderState;

  // Match data
  matchedPairId?: string;
  matchedSize?: bigint;
  matchedPriceBps?: number;
  counterpartyOrderId?: string;

  // Iceberg data
  icebergSlices?: IcebergSlice[];
  icebergExecutedUsdc?: bigint;

  // Metadata
  traderAddress: string;
  createdAt: number;
  revealedAt?: number;
  matchedAt?: number;
  settledAt?: number;
}

export interface IcebergSlice {
  sliceId: string;
  orderIndex: number;
  sizeUsdc: bigint;
  executedPriceBps?: number;
  polymarketOrderId?: string;
  state: 'PENDING' | 'SUBMITTED' | 'FILLED' | 'PARTIALLY_FILLED' | 'FAILED';
  scheduledAt: number;
  executedAt?: number;
  txHash?: string;
}

export interface MatchResult {
  pairId: string;
  buyOrderId: string;
  sellOrderId: string;
  matchedSizeUsdc: bigint;
  matchedPriceBps: number;
  market: string;
  timestamp: number;
}

export interface OrderSubmitRequest {
  commitHash: string;
  traderAddress: string;
  chain: Chain;
  // Revealed data (sent encrypted or after commit phase)
  market?: string;
  isYes?: boolean;
  sizeUsdc?: string;       // string for JSON serialization of bigint
  limitPriceBps?: number;
  expiryTimestamp?: number;
  salt?: string;
}

export interface OrderSubmitResponse {
  orderId: string;
  state: OrderState;
  txHash?: string;
  estimatedMatchTime?: number;
}

export interface OrderStatusResponse {
  orderId: string;
  state: OrderState;
  matchedSize?: string;
  matchedPrice?: number;
  icebergProgress?: {
    totalSlices: number;
    completedSlices: number;
    executedUsdc: string;
  };
}

export interface MarketInfo {
  conditionId: string;
  title: string;
  yesPrice: number;
  noPrice: number;
  volume24h: number;
  liquidity: number;
  source: 'polymarket' | 'gemini' | 'dflow';
}

export interface CrossVenueArbitrage {
  market: string;
  polymarketPrice: number;
  geminiPrice: number;
  spread: number;
  direction: 'BUY_POLY_SELL_GEMINI' | 'BUY_GEMINI_SELL_POLY';
}

export interface NewsSignal {
  articleTitle: string;
  articleUrl: string;
  affectedMarket: string;
  currentPrice: number;
  estimatedProb: number;
  edge: number;
  confidence: number;
  action: 'BUY_YES' | 'BUY_NO' | 'HOLD';
  timestamp: number;
}

// WebSocket event types
export type WsEventType =
  | 'order.committed'
  | 'order.revealed'
  | 'order.matched'
  | 'order.settled'
  | 'iceberg.slice'
  | 'iceberg.complete'
  | 'arb.detected'
  | 'news.signal';

export interface WsEvent {
  type: WsEventType;
  data: Record<string, unknown>;
  timestamp: number;
}

// Config
export interface AppConfig {
  port: number;
  redisUrl: string;
  alchemyRpcUrl: string;
  solanaRpcUrl: string;
  darkPoolArbiterAddress: string;
  alkahestAddress: string;
  tronFullHost: string;
  matchingEnginePrivateKey: string;
}
