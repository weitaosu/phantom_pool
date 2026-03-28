import type { DarkPoolOrder, OrderState } from '../types/orders.js';

interface PriceLevel {
  priceBps: number;
  orders: DarkPoolOrder[];
}

/** Normalize market identifiers for matching: lowercase, strip non-alphanumeric */
function normalizeMarket(market: string): string {
  return market.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export class OrderBook {
  // market => side => sorted price levels
  private buySide: Map<string, PriceLevel[]> = new Map();
  private sellSide: Map<string, PriceLevel[]> = new Map();
  private ordersById: Map<string, DarkPoolOrder> = new Map();

  enqueue(order: DarkPoolOrder): void {
    this.ordersById.set(order.orderId, order);
    const side = order.isYes ? this.buySide : this.sellSide;
    const market = normalizeMarket(order.market);

    if (!side.has(market)) {
      side.set(market, []);
    }

    const levels = side.get(market)!;
    let level = levels.find(l => l.priceBps === order.limitPriceBps);

    if (!level) {
      level = { priceBps: order.limitPriceBps, orders: [] };
      levels.push(level);
      // Sort: buys descending (highest first), sells ascending (lowest first)
      if (order.isYes) {
        levels.sort((a, b) => b.priceBps - a.priceBps);
      } else {
        levels.sort((a, b) => a.priceBps - b.priceBps);
      }
    }

    // Time priority within same price level — newest at end
    level.orders.push(order);
  }

  /**
   * Remove from price levels only (keeps in ordersById for status queries).
   * Used after matching so matched orders remain visible in the order list.
   */
  removeFromLevels(orderId: string): void {
    const order = this.ordersById.get(orderId);
    if (!order) return;

    const side = order.isYes ? this.buySide : this.sellSide;
    const normalizedMarket = normalizeMarket(order.market);
    const levels = side.get(normalizedMarket);
    if (!levels) return;

    for (const level of levels) {
      const idx = level.orders.findIndex(o => o.orderId === orderId);
      if (idx !== -1) {
        level.orders.splice(idx, 1);
        break;
      }
    }

    const filtered = levels.filter(l => l.orders.length > 0);
    side.set(normalizedMarket, filtered);
  }

  /**
   * Fully remove from both price levels and ordersById.
   */
  dequeue(orderId: string): DarkPoolOrder | undefined {
    const order = this.ordersById.get(orderId);
    if (!order) return undefined;

    this.removeFromLevels(orderId);
    this.ordersById.delete(orderId);

    return order;
  }

  getOrder(orderId: string): DarkPoolOrder | undefined {
    return this.ordersById.get(orderId);
  }

  getBuySide(market: string): PriceLevel[] {
    return this.buySide.get(normalizeMarket(market)) ?? [];
  }

  getSellSide(market: string): PriceLevel[] {
    return this.sellSide.get(normalizeMarket(market)) ?? [];
  }

  getMarkets(): string[] {
    const markets = new Set<string>();
    for (const m of this.buySide.keys()) markets.add(m);
    for (const m of this.sellSide.keys()) markets.add(m);
    return Array.from(markets);
  }

  getDepth(market: string): { buyOrders: number; sellOrders: number; totalBuyUsdc: bigint; totalSellUsdc: bigint } {
    const buyLevels = this.buySide.get(normalizeMarket(market)) ?? [];
    const sellLevels = this.sellSide.get(normalizeMarket(market)) ?? [];

    let buyOrders = 0;
    let totalBuyUsdc = 0n;
    for (const level of buyLevels) {
      buyOrders += level.orders.length;
      for (const o of level.orders) totalBuyUsdc += o.sizeUsdc;
    }

    let sellOrders = 0;
    let totalSellUsdc = 0n;
    for (const level of sellLevels) {
      sellOrders += level.orders.length;
      for (const o of level.orders) totalSellUsdc += o.sizeUsdc;
    }

    return { buyOrders, sellOrders, totalBuyUsdc, totalSellUsdc };
  }

  updateOrderState(orderId: string, state: OrderState): void {
    const order = this.ordersById.get(orderId);
    if (order) {
      order.state = state;
    }
  }

  getAllOrders(): DarkPoolOrder[] {
    return Array.from(this.ordersById.values());
  }

  getOrdersByTrader(traderAddress: string): DarkPoolOrder[] {
    return Array.from(this.ordersById.values())
      .filter(o => o.traderAddress === traderAddress);
  }

  clear(): void {
    this.buySide.clear();
    this.sellSide.clear();
    this.ordersById.clear();
  }
}
