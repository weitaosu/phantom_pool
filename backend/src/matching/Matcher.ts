import { EventEmitter } from 'node:events';
import { randomBytes } from 'node:crypto';
import type { DarkPoolOrder, MatchResult } from '../types/orders.js';
import { OrderState } from '../types/orders.js';
import { OrderBook } from './OrderBook.js';

export class Matcher extends EventEmitter {
  constructor(private orderBook: OrderBook) {
    super();
  }

  /**
   * Run matching across all markets. Returns all new matches found.
   * Uses price-time priority: best price first, earliest order first at same price.
   */
  runMatch(): MatchResult[] {
    const allResults: MatchResult[] = [];

    for (const market of this.orderBook.getMarkets()) {
      const results = this.matchMarket(market);
      allResults.push(...results);
    }

    return allResults;
  }

  /**
   * Match a single market. Pairs buy orders (YES) with sell orders (NO/reverse YES).
   *
   * Buy side: sorted highest limitPrice first (most aggressive buyer)
   * Sell side: sorted lowest limitPrice first (most aggressive seller)
   *
   * Match condition: buyer's limit >= (10000 - seller's limit)
   * This means: buyer is willing to pay at least as much as seller wants.
   *
   * For prediction markets:
   * - Buy YES at 65¢ means limitPriceBps = 6500
   * - Sell YES at 63¢ means isYes=false, limitPriceBps = 3700 (they want NO at 37¢)
   *   OR isYes=false, limitPriceBps = 6300 (they want to sell YES at 63¢)
   *
   * We use a simplified model: isYes=true = buyer of YES, isYes=false = seller of YES.
   * Match when buyer's price >= seller's price.
   */
  private matchMarket(market: string): MatchResult[] {
    const results: MatchResult[] = [];
    const buys = this.flattenSide(this.orderBook.getBuySide(market));
    const sells = this.flattenSide(this.orderBook.getSellSide(market));

    let bi = 0;
    let si = 0;

    while (bi < buys.length && si < sells.length) {
      const buy = buys[bi];
      const sell = sells[si];

      // Skip orders not in REVEALED state
      if (buy.state !== OrderState.REVEALED) { bi++; continue; }
      if (sell.state !== OrderState.REVEALED) { si++; continue; }

      // Skip expired orders
      const now = Math.floor(Date.now() / 1000);
      if (buy.expiryTimestamp <= now) { bi++; continue; }
      if (sell.expiryTimestamp <= now) { si++; continue; }

      // Match condition: buyer willing to pay >= seller's asking price
      if (buy.limitPriceBps >= sell.limitPriceBps) {
        // Determine matched size (minimum of both remaining sizes)
        const matchedSize = buy.sizeUsdc < sell.sizeUsdc ? buy.sizeUsdc : sell.sizeUsdc;

        // Midpoint price
        const matchedPrice = Math.floor((buy.limitPriceBps + sell.limitPriceBps) / 2);

        const pairId = randomBytes(16).toString('hex');

        const result: MatchResult = {
          pairId,
          buyOrderId: buy.orderId,
          sellOrderId: sell.orderId,
          matchedSizeUsdc: matchedSize,
          matchedPriceBps: matchedPrice,
          market,
          timestamp: Date.now(),
        };

        results.push(result);

        // Update order states
        buy.matchedPairId = pairId;
        buy.matchedSize = matchedSize;
        buy.matchedPriceBps = matchedPrice;
        buy.matchedAt = Date.now();
        buy.counterpartyOrderId = sell.orderId;

        sell.matchedPairId = pairId;
        sell.matchedSize = matchedSize;
        sell.matchedPriceBps = matchedPrice;
        sell.matchedAt = Date.now();
        sell.counterpartyOrderId = buy.orderId;

        // Reduce remaining sizes
        const buyRemaining = buy.sizeUsdc - matchedSize;
        const sellRemaining = sell.sizeUsdc - matchedSize;

        if (buyRemaining === 0n) {
          buy.state = OrderState.MATCHED;
          this.orderBook.removeFromLevels(buy.orderId); // keep in ordersById for status
          bi++;
        } else {
          buy.sizeUsdc = buyRemaining;
          buy.state = OrderState.MATCHED;
          this.emit('partial-fill', buy, matchedSize);
        }

        if (sellRemaining === 0n) {
          sell.state = OrderState.MATCHED;
          this.orderBook.removeFromLevels(sell.orderId); // keep in ordersById for status
          si++;
        } else {
          sell.sizeUsdc = sellRemaining;
          sell.state = OrderState.MATCHED;
          this.emit('partial-fill', sell, matchedSize);
        }

        this.emit('match', result);
      } else {
        // No more matches: best remaining buy < best remaining sell
        break;
      }
    }

    return results;
  }

  /**
   * Flatten price levels into a single ordered array.
   * Price levels are already sorted by the OrderBook (best price first).
   * Within each level, orders are sorted by time (FIFO).
   */
  private flattenSide(levels: { priceBps: number; orders: DarkPoolOrder[] }[]): DarkPoolOrder[] {
    const flat: DarkPoolOrder[] = [];
    for (const level of levels) {
      for (const order of level.orders) {
        flat.push(order);
      }
    }
    return flat;
  }

  /**
   * Submit a new order and immediately attempt matching.
   */
  submitAndMatch(order: DarkPoolOrder): MatchResult[] {
    this.orderBook.enqueue(order);
    return this.runMatch();
  }
}
