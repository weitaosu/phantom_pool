import type { MarketInfo, CrossVenueArbitrage } from '../types/orders.js';

/**
 * Gemini Prediction Markets API client.
 * Uses the real API shape from docs: GET /v1/prediction-markets/events
 * Response: { data: Event[] } where each Event has contracts[].
 * No auth needed for public endpoints.
 */

const GEMINI_BASE = 'https://api.gemini.com';

interface GeminiContract {
  id: string;
  label: string;
  abbreviatedName: string;
  prices: {
    bestBid: number | null;
    bestAsk: number | null;
    lastTradePrice: number | null;
  };
  status: string;
  instrumentSymbol: string;
}

interface GeminiEvent {
  id: string;
  title: string;
  type: string;       // "binary" or "categorical"
  category: string;
  status: string;
  contracts: GeminiContract[];
  tags?: string[];
}

export class GeminiPriceFeed {
  private cache: Map<string, { data: GeminiEvent[]; expiry: number }> = new Map();

  async getEvents(category?: string): Promise<GeminiEvent[]> {
    const cacheKey = `events-${category ?? 'all'}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) return cached.data;

    try {
      let url = `${GEMINI_BASE}/v1/prediction-markets/events?status=active`;
      if (category) url += `&category=${encodeURIComponent(category)}`;

      const res = await fetch(url);
      if (!res.ok) return this.getMockEvents();

      // Real API returns { data: Event[] }
      const json = await res.json() as { data?: GeminiEvent[] } | GeminiEvent[];
      const events = Array.isArray(json) ? json : (json.data ?? []);

      this.cache.set(cacheKey, { data: events, expiry: Date.now() + 30_000 });
      return events;
    } catch {
      return this.getMockEvents();
    }
  }

  async getContractPrice(instrumentSymbol: string): Promise<{ bid: number; ask: number; mid: number }> {
    try {
      // Use Gemini's standard order book endpoint with the instrument symbol
      const res = await fetch(`${GEMINI_BASE}/v1/book/${instrumentSymbol}`);
      if (!res.ok) return { bid: 0.5, ask: 0.5, mid: 0.5 };
      const book = await res.json() as { bids: Array<{ price: string }>; asks: Array<{ price: string }> };
      const bid = parseFloat(book.bids?.[0]?.price ?? '0.5');
      const ask = parseFloat(book.asks?.[0]?.price ?? '0.5');
      return { bid, ask, mid: (bid + ask) / 2 };
    } catch {
      return { bid: 0.5, ask: 0.5, mid: 0.5 };
    }
  }

  async detectArbitrage(polymarketMarkets: MarketInfo[]): Promise<CrossVenueArbitrage[]> {
    const geminiEvents = await this.getEvents();
    const opportunities: CrossVenueArbitrage[] = [];

    for (const event of geminiEvents) {
      for (const polymarket of polymarketMarkets) {
        const similarity = this.calculateSimilarity(event.title, polymarket.title);
        if (similarity < 0.3) continue;

        // Use the first contract's price (YES side for binary events)
        const contract = event.contracts[0];
        if (!contract) continue;

        const geminiPrice = contract.prices.lastTradePrice
          ?? contract.prices.bestBid
          ?? 0.5;
        const polyPrice = polymarket.yesPrice;
        const spread = Math.abs(geminiPrice - polyPrice);

        if (spread > 0.02) {
          opportunities.push({
            market: polymarket.title,
            polymarketPrice: polyPrice,
            geminiPrice,
            spread,
            direction: geminiPrice > polyPrice ? 'BUY_POLY_SELL_GEMINI' : 'BUY_GEMINI_SELL_POLY',
          });
        }
      }
    }

    return opportunities;
  }

  toMarketInfo(events: GeminiEvent[]): MarketInfo[] {
    return events.flatMap(e =>
      e.contracts.map(c => ({
        conditionId: c.instrumentSymbol,
        title: `${e.title} — ${c.label}`,
        yesPrice: c.prices.lastTradePrice ?? c.prices.bestBid ?? 0.5,
        noPrice: 1 - (c.prices.lastTradePrice ?? c.prices.bestBid ?? 0.5),
        volume24h: 0,
        liquidity: 0,
        source: 'gemini' as const,
      })),
    );
  }

  private calculateSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    let overlap = 0;
    for (const w of wordsA) if (wordsB.has(w)) overlap++;
    return overlap / Math.max(wordsA.size, wordsB.size, 1);
  }

  private getMockEvents(): GeminiEvent[] {
    return [
      {
        id: '4201', title: 'Fed Rate Cut in Q2 2026', type: 'binary', category: 'Economics', status: 'active',
        contracts: [{
          id: '4201-1', label: 'Yes', abbreviatedName: 'YES',
          prices: { bestBid: 0.70, bestAsk: 0.74, lastTradePrice: 0.72 },
          status: 'active', instrumentSymbol: 'GEMI-FEDQ2-YES',
        }],
      },
      {
        id: '4202', title: 'BTC above $100k end of 2026', type: 'binary', category: 'Crypto', status: 'active',
        contracts: [{
          id: '4202-1', label: 'Yes', abbreviatedName: 'YES',
          prices: { bestBid: 0.40, bestAsk: 0.46, lastTradePrice: 0.44 },
          status: 'active', instrumentSymbol: 'GEMI-BTC100K-YES',
        }],
      },
      {
        id: '4203', title: 'Trump Wins 2028 Election', type: 'binary', category: 'Politics', status: 'active',
        contracts: [{
          id: '4203-1', label: 'Yes', abbreviatedName: 'YES',
          prices: { bestBid: 0.28, bestAsk: 0.34, lastTradePrice: 0.31 },
          status: 'active', instrumentSymbol: 'GEMI-TRUMP28-YES',
        }],
      },
    ];
  }
}
