import { Router, type Request, type Response } from 'express';
import { randomBytes } from 'node:crypto';
import type { OrderSubmitRequest, OrderSubmitResponse, OrderStatusResponse } from '../types/orders.js';
import { OrderState, Chain } from '../types/orders.js';
import type { OrderBook } from '../matching/OrderBook.js';
import type { Matcher } from '../matching/Matcher.js';
import type { IcebergQueue } from '../iceberg/IcebergQueue.js';
import type { Settler } from '../chain/Settler.js';

interface OrderRouteDeps {
  orderBook: OrderBook;
  matcher: Matcher;
  icebergQueue: IcebergQueue;
  settler: Settler;
}

export function createOrderRoutes(deps: OrderRouteDeps): Router {
  const router = Router();
  const { orderBook, matcher, icebergQueue, settler } = deps;

  // POST /api/orders/submit — submit a new dark pool order
  router.post('/submit', (req: Request, res: Response) => {
    try {
      const body = req.body as OrderSubmitRequest;

      if (!body.commitHash || !body.traderAddress) {
        res.status(400).json({ error: 'commitHash and traderAddress required' });
        return;
      }

      const orderId = `dp-${randomBytes(12).toString('hex')}`;
      const chain = body.chain ?? Chain.POLYGON;

      const order = {
        orderId,
        commitHash: body.commitHash,
        market: body.market ?? '',
        isYes: body.isYes ?? true,
        sizeUsdc: BigInt(body.sizeUsdc ?? '0'),
        limitPriceBps: body.limitPriceBps ?? 0,
        expiryTimestamp: body.expiryTimestamp ?? Math.floor(Date.now() / 1000) + 600,
        salt: body.salt ?? randomBytes(32).toString('hex'),
        chain,
        state: body.market ? OrderState.REVEALED : OrderState.COMMITTED,
        traderAddress: body.traderAddress,
        createdAt: Date.now(),
        revealedAt: body.market ? Date.now() : undefined,
      };

      // If fully revealed, add to matching engine
      if (order.state === OrderState.REVEALED) {
        const matches = matcher.submitAndMatch(order);

        // Settle matches asynchronously (fire-and-forget, non-fatal)
        if (matches.length > 0) {
          try {
            for (const match of matches) settler.queueSettlement(match);
            settler.processQueue().catch(() => {});
          } catch { /* settler may be disabled */ }
        }
      } else {
        orderBook.enqueue(order);
      }

      const response: OrderSubmitResponse & { matchedSize?: string; matchedPrice?: number } = {
        orderId: order.orderId,
        state: order.state,
        estimatedMatchTime: order.state === OrderState.MATCHED ? 0 : 600,
      };

      if (order.matchedSize) {
        response.matchedSize = order.matchedSize.toString();
        response.matchedPrice = order.matchedPriceBps;
      }

      res.status(201).json(response);
    } catch (error) {
      console.error('[Orders] Submit error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/orders/reveal — reveal a previously committed order
  router.post('/reveal', (req: Request, res: Response) => {
    try {
      const { orderId, market, isYes, sizeUsdc, limitPriceBps, expiryTimestamp, salt } = req.body;

      const order = orderBook.getOrder(orderId);
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      if (order.state !== OrderState.COMMITTED) {
        res.status(400).json({ error: `Cannot reveal order in ${order.state} state` });
        return;
      }

      // Update order with revealed data
      order.market = market;
      order.isYes = isYes;
      order.sizeUsdc = BigInt(sizeUsdc);
      order.limitPriceBps = limitPriceBps;
      order.expiryTimestamp = expiryTimestamp;
      order.salt = salt;
      order.state = OrderState.REVEALED;
      order.revealedAt = Date.now();

      // Re-insert into order book for matching
      orderBook.dequeue(orderId);
      const matches = matcher.submitAndMatch(order);

      for (const match of matches) {
        settler.queueSettlement(match);
      }

      if (matches.length > 0) {
        settler.processQueue().catch(err => {
          console.error('[Orders] Settlement processing failed:', err);
        });
      }

      res.json({
        orderId,
        state: order.state,
        matchesFound: matches.length,
        matches: matches.map(m => ({
          pairId: m.pairId,
          matchedSize: m.matchedSizeUsdc.toString(),
          matchedPrice: m.matchedPriceBps,
        })),
      });
    } catch (error) {
      console.error('[Orders] Reveal error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/orders/:orderId — get order status
  router.get('/:orderId', (req: Request, res: Response) => {
    const { orderId } = req.params;
    const order = orderBook.getOrder(orderId);

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const icebergProgress = icebergQueue.getProgress(orderId);

    const response: OrderStatusResponse = {
      orderId: order.orderId,
      state: order.state,
      matchedSize: order.matchedSize?.toString(),
      matchedPrice: order.matchedPriceBps,
      icebergProgress: icebergProgress ? {
        totalSlices: icebergProgress.total,
        completedSlices: icebergProgress.completed,
        executedUsdc: icebergProgress.executedUsdc.toString(),
      } : undefined,
    };

    res.json(response);
  });

  // GET /api/orders?trader=0x... — get all orders for a trader
  router.get('/', (req: Request, res: Response) => {
    const trader = req.query.trader as string | undefined;

    const orders = trader
      ? orderBook.getOrdersByTrader(trader)
      : orderBook.getAllOrders();

    res.json(orders.map(o => ({
      orderId: o.orderId,
      market: o.market,
      isYes: o.isYes,
      sizeUsdc: o.sizeUsdc.toString(),
      limitPriceBps: o.limitPriceBps,
      state: o.state,
      chain: o.chain,
      matchedSize: o.matchedSize?.toString(),
      matchedPrice: o.matchedPriceBps,
      createdAt: o.createdAt,
    })));
  });

  // DELETE /api/orders/:orderId — cancel an order
  router.delete('/:orderId', (req: Request, res: Response) => {
    const { orderId } = req.params;
    const order = orderBook.dequeue(orderId);

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.state === OrderState.MATCHED || order.state === OrderState.SETTLED) {
      res.status(400).json({ error: 'Cannot cancel matched/settled order' });
      return;
    }

    order.state = OrderState.CANCELLED;
    icebergQueue.cancel(orderId);

    res.json({ orderId, state: OrderState.CANCELLED });
  });

  // GET /api/orders/orderbook/:market — anonymized order book depth
  router.get('/orderbook/:market', (req: Request, res: Response) => {
    const { market } = req.params;
    const depth = orderBook.getDepth(market);

    res.json({
      market,
      buyOrders: depth.buyOrders,
      sellOrders: depth.sellOrders,
      // Don't expose actual sizes for privacy
      estimatedBuyPressure: depth.totalBuyUsdc > depth.totalSellUsdc ? 'HIGH' : 'LOW',
    });
  });

  return router;
}
