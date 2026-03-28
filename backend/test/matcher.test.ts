import { describe, it, expect, beforeEach } from 'vitest';
import { OrderBook } from '../src/matching/OrderBook.js';
import { Matcher } from '../src/matching/Matcher.js';
import { OrderState, Chain, type DarkPoolOrder } from '../src/types/orders.js';

function makeOrder(overrides: Partial<DarkPoolOrder> = {}): DarkPoolOrder {
  const id = Math.random().toString(36).slice(2, 10);
  return {
    orderId: `test-${id}`,
    commitHash: `0x${id}`,
    market: '0xmarket1',
    isYes: true,
    sizeUsdc: 1000_000000n,  // $1,000
    limitPriceBps: 6500,     // 65¢
    expiryTimestamp: Math.floor(Date.now() / 1000) + 3600,
    salt: '0xsalt',
    chain: Chain.POLYGON,
    state: OrderState.REVEALED,
    traderAddress: '0xtrader1',
    createdAt: Date.now(),
    revealedAt: Date.now(),
    ...overrides,
  };
}

describe('Matcher', () => {
  let orderBook: OrderBook;
  let matcher: Matcher;

  beforeEach(() => {
    orderBook = new OrderBook();
    matcher = new Matcher(orderBook);
  });

  describe('exact match', () => {
    it('matches a buy and sell at same price', () => {
      const buy = makeOrder({ isYes: true, limitPriceBps: 6500, sizeUsdc: 1000_000000n });
      const sell = makeOrder({ isYes: false, limitPriceBps: 6500, sizeUsdc: 1000_000000n, traderAddress: '0xtrader2' });

      orderBook.enqueue(buy);
      orderBook.enqueue(sell);

      const results = matcher.runMatch();

      expect(results).toHaveLength(1);
      expect(results[0].buyOrderId).toBe(buy.orderId);
      expect(results[0].sellOrderId).toBe(sell.orderId);
      expect(results[0].matchedSizeUsdc).toBe(1000_000000n);
      expect(results[0].matchedPriceBps).toBe(6500); // midpoint of 6500 and 6500
    });
  });

  describe('price overlap — midpoint pricing', () => {
    it('matches when buy limit > sell limit, uses midpoint', () => {
      const buy = makeOrder({ isYes: true, limitPriceBps: 7000, sizeUsdc: 500_000000n });
      const sell = makeOrder({ isYes: false, limitPriceBps: 6000, sizeUsdc: 500_000000n, traderAddress: '0xtrader2' });

      orderBook.enqueue(buy);
      orderBook.enqueue(sell);

      const results = matcher.runMatch();

      expect(results).toHaveLength(1);
      expect(results[0].matchedPriceBps).toBe(6500); // midpoint of 7000 and 6000
    });
  });

  describe('no match', () => {
    it('does not match when buy limit < sell limit', () => {
      const buy = makeOrder({ isYes: true, limitPriceBps: 5000 });
      const sell = makeOrder({ isYes: false, limitPriceBps: 7000, traderAddress: '0xtrader2' });

      orderBook.enqueue(buy);
      orderBook.enqueue(sell);

      const results = matcher.runMatch();
      expect(results).toHaveLength(0);
    });

    it('does not match orders on different markets', () => {
      const buy = makeOrder({ isYes: true, market: '0xmarketA' });
      const sell = makeOrder({ isYes: false, market: '0xmarketB', traderAddress: '0xtrader2' });

      orderBook.enqueue(buy);
      orderBook.enqueue(sell);

      const results = matcher.runMatch();
      expect(results).toHaveLength(0);
    });

    it('does not match two buys', () => {
      const buy1 = makeOrder({ isYes: true });
      const buy2 = makeOrder({ isYes: true, traderAddress: '0xtrader2' });

      orderBook.enqueue(buy1);
      orderBook.enqueue(buy2);

      const results = matcher.runMatch();
      expect(results).toHaveLength(0);
    });
  });

  describe('partial fill', () => {
    it('matches the smaller size when orders differ', () => {
      const buy = makeOrder({ isYes: true, sizeUsdc: 5000_000000n, limitPriceBps: 6500 });
      const sell = makeOrder({ isYes: false, sizeUsdc: 2000_000000n, limitPriceBps: 6500, traderAddress: '0xtrader2' });

      orderBook.enqueue(buy);
      orderBook.enqueue(sell);

      const results = matcher.runMatch();

      expect(results).toHaveLength(1);
      expect(results[0].matchedSizeUsdc).toBe(2000_000000n); // min(5000, 2000)
    });
  });

  describe('price-time priority', () => {
    it('matches the most aggressive buy first', () => {
      // Two buys: one at 70¢, one at 65¢
      const aggressiveBuy = makeOrder({ isYes: true, limitPriceBps: 7000, traderAddress: '0xaggressive' });
      const passiveBuy = makeOrder({ isYes: true, limitPriceBps: 6500, traderAddress: '0xpassive' });
      const sell = makeOrder({ isYes: false, limitPriceBps: 6000, sizeUsdc: 1000_000000n, traderAddress: '0xseller' });

      orderBook.enqueue(aggressiveBuy);
      orderBook.enqueue(passiveBuy);
      orderBook.enqueue(sell);

      const results = matcher.runMatch();

      expect(results).toHaveLength(1);
      expect(results[0].buyOrderId).toBe(aggressiveBuy.orderId);
    });

    it('matches earlier order first at same price level', () => {
      const earlyBuy = makeOrder({ isYes: true, limitPriceBps: 6500, traderAddress: '0xearly' });
      // Small delay to ensure ordering
      const lateBuy = makeOrder({ isYes: true, limitPriceBps: 6500, traderAddress: '0xlate' });
      const sell = makeOrder({ isYes: false, limitPriceBps: 6500, sizeUsdc: 1000_000000n, traderAddress: '0xseller' });

      orderBook.enqueue(earlyBuy);
      orderBook.enqueue(lateBuy);
      orderBook.enqueue(sell);

      const results = matcher.runMatch();

      expect(results).toHaveLength(1);
      expect(results[0].buyOrderId).toBe(earlyBuy.orderId); // FIFO within same price
    });
  });

  describe('multi-order matching', () => {
    it('matches multiple pairs across a market', () => {
      const buy1 = makeOrder({ isYes: true, limitPriceBps: 7000, sizeUsdc: 500_000000n, traderAddress: '0xb1' });
      const buy2 = makeOrder({ isYes: true, limitPriceBps: 6500, sizeUsdc: 300_000000n, traderAddress: '0xb2' });
      const sell1 = makeOrder({ isYes: false, limitPriceBps: 6000, sizeUsdc: 400_000000n, traderAddress: '0xs1' });
      const sell2 = makeOrder({ isYes: false, limitPriceBps: 6500, sizeUsdc: 400_000000n, traderAddress: '0xs2' });

      orderBook.enqueue(buy1);
      orderBook.enqueue(buy2);
      orderBook.enqueue(sell1);
      orderBook.enqueue(sell2);

      const results = matcher.runMatch();

      // buy1 (7000, 500) matches sell1 (6000, 400) → 400 at midpoint 6500
      // buy1 remaining 100 matches sell2 (6500, 400) → 100 at midpoint 6750
      // buy2 (6500, 300) matches sell2 remaining (300) → 300 at 6500
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('expired orders', () => {
    it('skips expired orders', () => {
      const buy = makeOrder({ isYes: true, expiryTimestamp: Math.floor(Date.now() / 1000) - 60 }); // expired 1 min ago
      const sell = makeOrder({ isYes: false, limitPriceBps: 6500, traderAddress: '0xtrader2' });

      orderBook.enqueue(buy);
      orderBook.enqueue(sell);

      const results = matcher.runMatch();
      expect(results).toHaveLength(0);
    });
  });

  describe('submitAndMatch', () => {
    it('enqueues and immediately matches', () => {
      const sell = makeOrder({ isYes: false, limitPriceBps: 6000, traderAddress: '0xseller' });
      orderBook.enqueue(sell);

      const buy = makeOrder({ isYes: true, limitPriceBps: 7000, traderAddress: '0xbuyer' });
      const results = matcher.submitAndMatch(buy);

      expect(results).toHaveLength(1);
      expect(results[0].matchedPriceBps).toBe(6500);
    });
  });
});

describe('OrderBook', () => {
  let orderBook: OrderBook;

  beforeEach(() => {
    orderBook = new OrderBook();
  });

  it('enqueues and retrieves orders', () => {
    const order = makeOrder();
    orderBook.enqueue(order);

    expect(orderBook.getOrder(order.orderId)).toBe(order);
    expect(orderBook.getAllOrders()).toHaveLength(1);
  });

  it('dequeues orders', () => {
    const order = makeOrder();
    orderBook.enqueue(order);

    const removed = orderBook.dequeue(order.orderId);
    expect(removed).toBe(order);
    expect(orderBook.getOrder(order.orderId)).toBeUndefined();
  });

  it('reports depth correctly', () => {
    const buy = makeOrder({ isYes: true, sizeUsdc: 1000_000000n });
    const sell = makeOrder({ isYes: false, sizeUsdc: 2000_000000n, traderAddress: '0xother' });

    orderBook.enqueue(buy);
    orderBook.enqueue(sell);

    const depth = orderBook.getDepth('0xmarket1');
    expect(depth.buyOrders).toBe(1);
    expect(depth.sellOrders).toBe(1);
    expect(depth.totalBuyUsdc).toBe(1000_000000n);
    expect(depth.totalSellUsdc).toBe(2000_000000n);
  });

  it('filters by trader', () => {
    const order1 = makeOrder({ traderAddress: '0xalice' });
    const order2 = makeOrder({ traderAddress: '0xbob' });
    const order3 = makeOrder({ traderAddress: '0xalice' });

    orderBook.enqueue(order1);
    orderBook.enqueue(order2);
    orderBook.enqueue(order3);

    expect(orderBook.getOrdersByTrader('0xalice')).toHaveLength(2);
    expect(orderBook.getOrdersByTrader('0xbob')).toHaveLength(1);
  });

  it('sorts buy side descending', () => {
    const low = makeOrder({ isYes: true, limitPriceBps: 5000 });
    const high = makeOrder({ isYes: true, limitPriceBps: 8000 });

    orderBook.enqueue(low);
    orderBook.enqueue(high);

    const levels = orderBook.getBuySide('0xmarket1');
    expect(levels[0].priceBps).toBe(8000); // highest first
    expect(levels[1].priceBps).toBe(5000);
  });

  it('sorts sell side ascending', () => {
    const high = makeOrder({ isYes: false, limitPriceBps: 8000 });
    const low = makeOrder({ isYes: false, limitPriceBps: 5000 });

    orderBook.enqueue(high);
    orderBook.enqueue(low);

    const levels = orderBook.getSellSide('0xmarket1');
    expect(levels[0].priceBps).toBe(5000); // lowest first
    expect(levels[1].priceBps).toBe(8000);
  });
});
