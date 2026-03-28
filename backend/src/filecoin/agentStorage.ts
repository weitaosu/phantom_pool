import type { NewsSignal } from '../types/orders.js';

/**
 * Filecoin agent storage.
 *
 * When @filoz/synapse-sdk is available and configured, stores data on Filecoin calibnet:
 *   const synapse = await Synapse.create({ privateKey, rpcURL: RPC_URLS.calibration.websocket });
 *   const storage = await synapse.createStorage();
 *   const result = await storage.upload(new TextEncoder().encode(json));
 *
 * Falls back to local in-memory storage when SDK is unavailable (hackathon demo).
 */

interface StoredEntry {
  cid: string;
  type: 'identity' | 'order_log' | 'memory' | 'reputation';
  timestamp: number;
  data: Record<string, unknown>;
}

export class AgentStorage {
  private entries: StoredEntry[] = [];
  private agentId: string | null = null;
  private totalTrades = 0;
  private correctPredictions = 0;
  private synapse: any = null;
  private storage: any = null;

  async initialize(): Promise<void> {
    // Try to load real Synapse SDK
    try {
      // @ts-ignore — optional dependency
      const { Synapse, RPC_URLS } = await import('@filoz/synapse-sdk');
      const privateKey = process.env.FILECOIN_PRIVATE_KEY;
      if (privateKey) {
        this.synapse = await Synapse.create({
          privateKey,
          rpcURL: RPC_URLS.calibration.websocket,
        });
        this.storage = await this.synapse.createStorage();
        console.log('[AgentStorage] Connected to Filecoin calibnet via Synapse SDK');
      }
    } catch {
      console.log('[AgentStorage] Synapse SDK not available — using local storage');
    }
  }

  async registerAgent(metadata: Record<string, unknown>): Promise<string> {
    const data = {
      name: 'DarkPoolTradingAgent',
      version: '1.0.0',
      capabilities: ['prediction-market-trading', 'dark-pool-execution', 'news-analysis'],
      created_at: new Date().toISOString(),
      ...metadata,
    };

    const cid = await this.store('identity', data);
    this.agentId = cid;
    console.log(`[AgentStorage] Agent registered: ipfs://${cid}`);
    return cid;
  }

  async logOrder(order: { orderId: string; market: string; state: string; timestamp: number }): Promise<string> {
    return this.store('order_log', {
      orderId: order.orderId,
      market: order.market,
      state: order.state,
      timestamp: order.timestamp,
      agentId: this.agentId,
    });
  }

  async storeMemory(signal: NewsSignal, outcome?: { actualProb: number; pnl: number }): Promise<string> {
    if (outcome) {
      this.totalTrades++;
      if (outcome.pnl > 0) this.correctPredictions++;
    }

    return this.store('memory', {
      event_type: 'news_analysis',
      article_headline: signal.articleTitle,
      affected_market: signal.affectedMarket,
      predicted_edge: signal.edge,
      confidence: signal.confidence,
      action_taken: signal.action,
      outcome: outcome ?? null,
      agentId: this.agentId,
    });
  }

  getReputationReport() {
    return {
      agentId: this.agentId,
      accuracy: this.totalTrades > 0 ? this.correctPredictions / this.totalTrades : 0,
      totalTrades: this.totalTrades,
      correctPredictions: this.correctPredictions,
      cids: this.entries.filter(e => e.type === 'memory').map(e => e.cid),
      entries: this.entries.slice(-50),
      storageBackend: this.storage ? 'filecoin-calibnet' : 'local-memory',
    };
  }

  getAllEntries(): StoredEntry[] {
    return this.entries;
  }

  private async store(type: StoredEntry['type'], data: Record<string, unknown>): Promise<string> {
    let cid: string;

    if (this.storage) {
      // Real Filecoin storage via Synapse SDK
      try {
        const json = JSON.stringify({ type, timestamp: Date.now(), ...data });
        const result = await this.storage.upload(new TextEncoder().encode(json));
        cid = result.pieceCid;
      } catch (err) {
        console.warn('[AgentStorage] Filecoin upload failed, using local:', err);
        cid = this.generateLocalCid();
      }
    } else {
      cid = this.generateLocalCid();
    }

    this.entries.push({ cid, type, timestamp: Date.now(), data });
    return cid;
  }

  private generateLocalCid(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return 'bafy' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 55);
  }
}
