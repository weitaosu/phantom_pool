import { Router, type Request, type Response } from 'express';
import type { MarketInfo } from '../types/orders.js';

const POLYMARKET_GAMMA_URL = 'https://gamma-api.polymarket.com';

export function createMarketRoutes(): Router {
  const router = Router();

  // GET /api/markets — browse active markets (proxied from Polymarket)
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const response = await fetch(
        `${POLYMARKET_GAMMA_URL}/markets?closed=false&limit=20&order=volume24hr&ascending=false`,
      );

      if (!response.ok) {
        res.json(getMockMarkets());
        return;
      }

      const markets = await response.json() as Array<{
        conditionId: string;
        question: string;
        outcomePrices: string;
        volume24hr: number;
        liquidityNum: number;
      }>;

      const result: MarketInfo[] = markets.map(m => {
        let yesPrice = 0.5;
        let noPrice = 0.5;
        try {
          const prices = JSON.parse(m.outcomePrices) as number[];
          yesPrice = prices[0] ?? 0.5;
          noPrice = prices[1] ?? 0.5;
        } catch { /* use defaults */ }

        return {
          conditionId: m.conditionId,
          title: m.question,
          yesPrice,
          noPrice,
          volume24h: m.volume24hr,
          liquidity: m.liquidityNum,
          source: 'polymarket' as const,
        };
      });

      res.json(result);
    } catch (error) {
      console.error('[Markets] Failed to fetch from Polymarket:', error);
      res.json(getMockMarkets());
    }
  });

  // GET /api/markets/:conditionId/price — live price for a specific market
  router.get('/:conditionId/price', async (req: Request, res: Response) => {
    const { conditionId } = req.params;

    try {
      const response = await fetch(`${POLYMARKET_GAMMA_URL}/markets/${conditionId}`);
      if (!response.ok) {
        res.status(404).json({ error: 'Market not found' });
        return;
      }

      const market = await response.json() as {
        outcomePrices: string;
        volume24hr: number;
      };

      let yesPrice = 0.5;
      let noPrice = 0.5;
      try {
        const prices = JSON.parse(market.outcomePrices) as number[];
        yesPrice = prices[0] ?? 0.5;
        noPrice = prices[1] ?? 0.5;
      } catch { /* defaults */ }

      res.json({
        conditionId,
        yes: yesPrice,
        no: noPrice,
        volume24h: market.volume24hr,
      });
    } catch {
      res.status(502).json({ error: 'Failed to fetch market price' });
    }
  });

  return router;
}

function getMockMarkets(): MarketInfo[] {
  return [
    {
      conditionId: '0xmock_fed_rate_cut',
      title: 'Will the Fed cut rates in Q2 2026?',
      yesPrice: 0.67,
      noPrice: 0.33,
      volume24h: 2_400_000,
      liquidity: 450_000,
      source: 'polymarket',
    },
    {
      conditionId: '0xmock_btc_100k',
      title: 'Will BTC exceed $100k in 2026?',
      yesPrice: 0.43,
      noPrice: 0.57,
      volume24h: 5_200_000,
      liquidity: 1_200_000,
      source: 'polymarket',
    },
    {
      conditionId: '0xmock_trump_2028',
      title: 'Will Trump win the 2028 presidential election?',
      yesPrice: 0.31,
      noPrice: 0.69,
      volume24h: 8_100_000,
      liquidity: 2_500_000,
      source: 'polymarket',
    },
    {
      conditionId: '0xmock_eth_5k',
      title: 'Will ETH hit $5,000 in 2026?',
      yesPrice: 0.22,
      noPrice: 0.78,
      volume24h: 1_800_000,
      liquidity: 380_000,
      source: 'polymarket',
    },
  ];
}
