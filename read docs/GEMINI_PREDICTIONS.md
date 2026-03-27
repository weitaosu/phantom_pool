# Gemini Prediction Markets API Reference (Gemini Bounty)

> Docs: https://docs.gemini.com/prediction-markets/getting-started
> Markets: https://docs.gemini.com/prediction-markets/markets
> Trading: https://docs.gemini.com/prediction-markets/trading
> Positions: https://docs.gemini.com/prediction-markets/positions
> Schemas: https://docs.gemini.com/prediction-markets/~schemas
> Base URL: `https://api.gemini.com`
> Sandbox: `https://api.sandbox.gemini.com`
> No SDK — raw REST + WebSocket. Use native `fetch`.

## What It Is

Gemini Predictions is a CFTC-regulated prediction market (operated by Gemini Titan). Contracts are binary or categorical YES/NO bets on real-world events. Contracts trade between $0.01 and $0.99, settling at $1.00 (YES wins) or $0.00 (NO wins). YES + NO always equals $1.00.

The API provides public market data (no auth) and authenticated trading endpoints.

## Key Concepts

- **Event**: A real-world question (e.g., "Will Fed cut rates in Q2 2026?")
- **Contract**: A tradeable YES/NO outcome within an event
- **instrumentSymbol**: The trading symbol (e.g., `GEMI-FEDJAN26-DN25`)
- **Event types**: `binary` (YES/NO) or `categorical` (multiple outcomes)
- **Categories**: Crypto, Politics, Sports, Economics, Weather, etc.
- **Status**: `active`, `closed`, `underreview`, `settled`, `invalid`

## Public Endpoints (No Auth Required)

### List Active Events
```
GET /v1/prediction-markets/events?status=active
GET /v1/prediction-markets/events?status=active&category=Crypto
GET /v1/prediction-markets/events?status=active&category=Economics&search=fed
```

Query params:
- `status`: `active`, `closed`, `underreview`, `settled`, `invalid`
- `category`: `Crypto`, `Politics`, `Sports`, `Economics`, `Weather`, etc. (can specify multiple)
- `search`: Free text search
- `limit`, `offset`: Pagination

```typescript
// Fetch active events
const res = await fetch('https://api.gemini.com/v1/prediction-markets/events?status=active');
const { data } = await res.json();
// data: Event[]
```

### Event Response Shape
```json
{
  "data": [
    {
      "id": "4200",
      "title": "Lakers vs Celtics",
      "slug": "lakers-vs-celtics-march-10",
      "description": "NBA game prediction market",
      "imageUrl": "https://...",
      "type": "binary",
      "category": "Sports",
      "series": null,
      "ticker": "NBA260310LAL-BOS",
      "status": "active",
      "resolvedAt": null,
      "createdAt": "2026-03-04T12:00:00.000Z",
      "effectiveDate": "2026-03-10T19:30:00.000Z",
      "expiryDate": "2026-03-11T02:00:00.000Z",
      "liquidity": null,
      "tags": ["NBA", "Basketball"],
      "subcategory": {
        "id": 10,
        "slug": "sports_nba",
        "name": "NBA",
        "path": ["Sports", "NBA"]
      },
      "contracts": [
        {
          "id": "4200-1",
          "label": "Lakers Win",
          "abbreviatedName": "LAL",
          "prices": {
            "buy": {},
            "sell": {},
            "bestBid": null,
            "bestAsk": null,
            "lastTradePrice": null
          },
          "totalShares": null,
          "color": "#552583",
          "status": "active",
          "instrumentSymbol": "GEMI-NBA260310LAL-BOS-LAL"
        }
      ]
    }
  ]
}
```

### Get Recently Settled Events
```
GET /v1/prediction-markets/events/recently-settled
```

### Get Order Book for a Contract
Use the standard Gemini order book endpoint with the contract's `instrumentSymbol`:

```
GET /v1/book/{instrumentSymbol}
```

```typescript
const symbol = 'GEMI-FEDJAN26-DN25';
const res = await fetch(`https://api.gemini.com/v1/book/${symbol}`);
const { bids, asks } = await res.json();

const bestBid = parseFloat(bids[0]?.price ?? '0');
const bestAsk = parseFloat(asks[0]?.price ?? '0');
const mid = (bestBid + bestAsk) / 2;
```

### Get Recent Trades
```
GET /v1/trades/{instrumentSymbol}
GET /v1/trades/{instrumentSymbol}?limit_trades=50
```

## WebSocket (Live Prices)

```typescript
const crypto = require("crypto");
const WebSocket = require("ws");

const API_KEY = "your-api-key";
const API_SECRET = "your-api-secret";
const SYMBOL = "GEMI-PRES2028-VANCE";

// Auth headers
const nonce = Math.floor(Date.now() / 1000).toString();
const payload = Buffer.from(nonce).toString("base64");
const signature = crypto
  .createHmac("sha384", API_SECRET)
  .update(payload)
  .digest("hex");

const ws = new WebSocket("wss://ws.gemini.com", {
  headers: {
    "X-GEMINI-APIKEY": API_KEY,
    "X-GEMINI-NONCE": nonce,
    "X-GEMINI-PAYLOAD": payload,
    "X-GEMINI-SIGNATURE": signature,
  },
});

ws.on("open", () => {
  ws.send(JSON.stringify({
    id: "1",
    method: "subscribe",
    params: [
      `${SYMBOL}@bookTicker`,  // live bid/ask
      "orders@account",        // your order updates (auth required)
    ],
  }));
});

ws.on("message", (raw) => {
  const data = JSON.parse(raw);
  if (data.b && data.a) {
    console.log(`${data.s} bid: $${data.b} ask: $${data.a}`);
  }
});
```

### BookTicker Message Shape
```json
{
  "s": "GEMI-PRES2028-VANCE",
  "b": "0.26",    // best bid price
  "B": "5000",    // best bid quantity
  "a": "0.28",    // best ask price
  "A": "3200"     // best ask quantity
}
```

## Authenticated Endpoints (Trading)

### Authentication

All private endpoints use HMAC-SHA384:

```typescript
function geminiAuthHeaders(apiKey: string, apiSecret: string, payload: object) {
  const jsonPayload = JSON.stringify(payload);
  const b64Payload = Buffer.from(jsonPayload).toString("base64");
  const signature = crypto
    .createHmac("sha384", apiSecret)
    .update(b64Payload)
    .digest("hex");

  return {
    "Content-Type": "text/plain",
    "X-GEMINI-APIKEY": apiKey,
    "X-GEMINI-PAYLOAD": b64Payload,
    "X-GEMINI-SIGNATURE": signature,
  };
}
```

### Place Order
```
POST /v1/prediction-markets/order
```

```json
{
  "symbol": "GEMI-FEDJAN26-DN25",
  "orderType": "limit",
  "side": "buy",
  "quantity": "100",
  "price": "0.65",
  "outcome": "yes",
  "timeInForce": "good-til-cancel"
}
```

Response:
```json
{
  "orderId": 12345678901,
  "status": "open",
  "symbol": "GEMI-FEDJAN26-DN25",
  "side": "buy",
  "outcome": "yes",
  "orderType": "limit",
  "quantity": "100",
  "filledQuantity": "0",
  "remainingQuantity": "100",
  "price": "0.65",
  "avgExecutionPrice": null,
  "createdAt": "2025-12-15T10:30:00.000Z",
  "contractMetadata": {
    "contractId": "contract_123",
    "contractName": "FEDJAN26-DN25",
    "eventTicker": "FEDJAN26",
    "eventName": "Will Fed Funds Rate drop at least 0.25% at January 2026 meeting?",
    "category": "economics"
  }
}
```

### Cancel Order
```
POST /v1/prediction-markets/order/cancel
```
```json
{ "orderId": 12345678901 }
```

### Get Active Orders
```
POST /v1/prediction-markets/orders/active
```
```json
{ "symbol": "GEMI-FEDJAN26-DN25", "limit": 10, "offset": 0 }
```

### Get Order History
```
POST /v1/prediction-markets/orders/history
```
```json
{ "status": "filled", "symbol": "GEMI-FEDJAN26-DN25", "limit": 10, "offset": 0 }
```

### Get Positions
```
POST /v1/prediction-markets/positions
```

## For the Dark Pool Use Case (Cross-Venue Arb)

The plan uses Gemini as a secondary price feed alongside Polymarket for arbitrage detection:

```typescript
class GeminiPriceFeed {
  private baseUrl = 'https://api.gemini.com';

  // Get all active events
  async getEvents(category?: string): Promise<GeminiEvent[]> {
    const params = new URLSearchParams({ status: 'active' });
    if (category) params.set('category', category);
    const res = await fetch(`${this.baseUrl}/v1/prediction-markets/events?${params}`);
    const { data } = await res.json();
    return data;
  }

  // Get mid price for a specific contract
  async getContractPrice(instrumentSymbol: string) {
    const res = await fetch(`${this.baseUrl}/v1/book/${instrumentSymbol}`);
    const { bids, asks } = await res.json();
    const bid = parseFloat(bids?.[0]?.price ?? '0');
    const ask = parseFloat(asks?.[0]?.price ?? '0');
    return { bid, ask, mid: (bid + ask) / 2 };
  }

  // Find events that overlap with Polymarket markets
  // This uses GPT-4o semantic matching (see plan section 4)
  async findCrossVenueMatches(polymarketMarkets: any[]) {
    const geminiEvents = await this.getEvents();

    // Use OpenAI to semantically match events across venues
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: `Match these Gemini events to Polymarket markets by topic.
        Return JSON: { "matches": [{ "gemini_id", "polymarket_id", "similarity_score" }] }
        Gemini: ${JSON.stringify(geminiEvents.slice(0, 20))}
        Polymarket: ${JSON.stringify(polymarketMarkets.slice(0, 20))}`
      }],
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content).matches;
  }

  // Detect arb opportunities
  async detectArbitrage(matches: CrossVenueMatch[]) {
    const opportunities = [];
    for (const match of matches) {
      if (match.similarity_score < 0.8) continue;
      const geminiPrice = await this.getContractPrice(match.gemini_instrument);
      const polyPrice = await getPolymarketPrice(match.polymarket_id);
      const spread = Math.abs(geminiPrice.mid - polyPrice);
      if (spread > 0.02) {  // 2 cent spread = arb after fees
        opportunities.push({ ...match, geminiPrice, polyPrice, spread });
      }
    }
    return opportunities;
  }
}
```

## Error Codes

| Code | Meaning |
|------|---------|
| `-2010` | Order rejected (price out of range, quantity invalid, market closed) |
| `-1002` | Authentication required |
| `403 / TERMS_NOT_ACCEPTED` | Must accept Prediction Markets terms in Gemini Exchange UI first |
| `InsufficientFunds` | Not enough USD in account |

## Important Notes

- **Only documented fields are stable** — other fields in responses may change
- Prices are ALWAYS between `$0.01` and `$0.99`
- `YES + NO = $1.00` always
- Settlement: winning contracts auto-pay $1.00, losing contracts expire at $0.00
- **API key required for trading** — create at https://exchange.gemini.com/settings/api
- API key needs `Trading` and optionally `CancelOrder` permissions
- **US only**: Gemini Predictions is available to US customers only
- The public events/order book endpoints do NOT require authentication

## Gotchas & Risks

1. **No SDK**: Pure REST API. Use `fetch`. No npm package to install.
2. **Sandbox available**: Use `https://api.sandbox.gemini.com` for testing without real money.
3. **Auth is complex**: HMAC-SHA384 with base64 payload. Easy to get wrong — test carefully.
4. **Terms acceptance**: Must accept Prediction Markets terms in the Gemini web UI before the API works for trading. Public endpoints work without this.
5. **Category names are capitalized**: `Crypto`, `Politics`, `Sports`, `Economics` — not lowercase.
6. **instrumentSymbol format**: `GEMI-{TICKER}-{OUTCOME}` pattern (e.g., `GEMI-FEDJAN26-DN25`).
7. **For the hackathon**: The cross-venue arb feature only needs the PUBLIC endpoints (events + order book). Trading endpoints are a bonus.
8. **Rate limits**: Not explicitly documented — be conservative with polling frequency.
