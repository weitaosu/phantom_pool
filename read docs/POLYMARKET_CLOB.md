# Polymarket CLOB API Reference (Polymarket Bounty — Core)

> Docs: https://docs.polymarket.com/trading/overview
> CLOB Base URL: `https://clob.polymarket.com`
> Gamma API (market data): `https://gamma-api.polymarket.com`
> Data API (positions): `https://data-api.polymarket.com`
> JS SDK: `@polymarket/clob-client` (ethers v5)
> Python SDK: `py-clob-client`
> Chain: Polygon (chainId 137)
> Collateral: USDC on Polygon

## Architecture Overview

Polymarket has THREE separate APIs:
1. **Gamma API** — Market discovery, event metadata, categories (public, no auth)
2. **CLOB API** — Order book trading: place/cancel orders, get prices/books (auth for writes)
3. **Data API** — User positions, trade history (auth required)

Settlement uses the **CTF Exchange** smart contract on Polygon. Orders are signed with EIP-712, matched off-chain, settled on-chain atomically.

## SDK Installation (JavaScript)

```bash
npm install @polymarket/clob-client
# Requires ethers v5.x (not v6)
npm install ethers@5.8.0
```

## Client Initialization

```typescript
import { ClobClient } from "@polymarket/clob-client";
import { Wallet } from "ethers"; // v5.8.0

const signer = new Wallet(process.env.PRIVATE_KEY);

// Step 1: Derive API credentials (one-time)
const tempClient = new ClobClient("https://clob.polymarket.com", 137, signer);
const apiCreds = await tempClient.createOrDeriveApiKey();
// apiCreds = { key, secret, passphrase }

// Step 2: Initialize trading client
const client = new ClobClient(
  "https://clob.polymarket.com",
  137,
  signer,
  apiCreds,
  0,     // signature type: 0=EOA, 1=Magic/email, 2=GNOSIS_SAFE
  // If using Polymarket proxy wallet, add: funderAddress
);

// Read-only client (no auth needed)
const readClient = new ClobClient("https://clob.polymarket.com", 137);
```

### Signature Types
- `0` (default): Standard EOA wallet (MetaMask, raw private key)
- `1`: Email/Magic wallet proxy
- `2`: Gnosis Safe proxy

If you have a Polymarket.com account, your funds are in a **proxy wallet** (visible in profile). Use type 1 or 2 with the proxy address as `funder`.

## Public Endpoints (No Auth)

### Get Markets (via Gamma API)
```typescript
// Fetch active markets
const res = await fetch('https://gamma-api.polymarket.com/markets?closed=false&limit=20');
const markets = await res.json();
// Each market has: condition_id, question, tokens (YES/NO token IDs), etc.
```

### Get Price
```typescript
const price = await client.getPrice("TOKEN_ID", "BUY"); // or "SELL"
// Returns: { price: "0.65" }
```

### Get Midpoint
```typescript
const mid = await client.getMidpoint("TOKEN_ID");
// Returns: { mid: "0.645" }
```

### Get Order Book
```typescript
const book = await client.getOrderBook("TOKEN_ID");
// Returns: { bids: [{price, size}], asks: [{price, size}], market, asset_id, ... }
```

### Get Multiple Order Books
```typescript
const books = await client.getOrderBooks([
  { token_id: "TOKEN_ID_1" },
  { token_id: "TOKEN_ID_2" },
]);
```

## Trading Endpoints (Auth Required)

### Place Limit Order
```typescript
import { OrderBuilder } from "@polymarket/clob-client";

const order = await client.createOrder({
  tokenId: "TOKEN_ID",
  price: 0.65,       // 0.01 to 0.99
  size: 100,         // number of contracts
  side: "BUY",       // or "SELL"
});

const response = await client.postOrder(order);
// response = { orderID, status, ... }
```

### Place Market Order
```typescript
const order = await client.createMarketOrder({
  tokenId: "TOKEN_ID",
  amount: 25.0,      // USDC amount
  side: "BUY",
});

const response = await client.postOrder(order, "FOK"); // Fill-or-Kill
```

### Cancel Order
```typescript
await client.cancelOrder("ORDER_ID");
```

### Cancel All Orders
```typescript
await client.cancelAll();
```

### Get Active Orders
```typescript
const orders = await client.getOpenOrders();
```

## REST API (Direct, Without SDK)

### Authentication Headers

**L1 Headers** (for creating/deriving API creds):
- Sign a timestamp with your Polygon private key using EIP-712

**L2 Headers** (for all trading operations):
```
POLY_ADDRESS: your-api-key
POLY_SIGNATURE: hmac-sha256-signature
POLY_TIMESTAMP: unix-timestamp
POLY_NONCE: random-nonce
POLY_PASSPHRASE: your-passphrase
```

### Key REST Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/price?token_id=X&side=BUY` | No | Current price |
| GET | `/midpoint?token_id=X` | No | Midpoint price |
| GET | `/book?token_id=X` | No | Full order book |
| GET | `/trades?token_id=X` | L2 | Recent trades |
| POST | `/order` | L2 | Place order |
| DELETE | `/order/{id}` | L2 | Cancel order |
| GET | `/orders` | L2 | Get open orders |

## Gamma API (Market Discovery)

```
GET https://gamma-api.polymarket.com/markets
GET https://gamma-api.polymarket.com/markets?closed=false&limit=20
GET https://gamma-api.polymarket.com/events
GET https://gamma-api.polymarket.com/events?closed=false&limit=20
```

### Market Object Shape
```json
{
  "id": "0x...",
  "question": "Will the Fed cut rates in Q2 2026?",
  "conditionId": "0x...",
  "slug": "fed-rate-cut-q2-2026",
  "tokens": [
    { "token_id": "YES_TOKEN_ID", "outcome": "Yes", "price": 0.65 },
    { "token_id": "NO_TOKEN_ID", "outcome": "No", "price": 0.35 }
  ],
  "end_date_iso": "2026-06-30T00:00:00Z",
  "active": true,
  "closed": false,
  "accepting_orders": true,
  "volume": "125000.00",
  "liquidity": "50000.00",
  "category": "Economics"
}
```

## WebSocket (Live Data)

```typescript
// Subscribe to order book updates
const ws = new WebSocket("wss://ws-subscriptions-clob.polymarket.com/ws/market");

ws.on("open", () => {
  ws.send(JSON.stringify({
    type: "market",
    assets_ids: ["TOKEN_ID_1", "TOKEN_ID_2"],
  }));
});

ws.on("message", (data) => {
  const msg = JSON.parse(data);
  // msg contains order book updates, trades, etc.
});
```

## For the Dark Pool Use Case

### Iceberg Order Execution Pattern
The plan routes unmatched dark pool orders through Polymarket's CLOB as small timed slices:

```typescript
class IcebergExecutor {
  private client: ClobClient;

  async executeIceberg(
    tokenId: string,
    totalSize: number,
    side: "BUY" | "SELL",
    limitPrice: number,
    slices: number = 10,
    intervalMs: number = 60_000  // 1 min between slices
  ) {
    const sliceSize = totalSize / slices;

    for (let i = 0; i < slices; i++) {
      const jitter = Math.random() * 0.3 + 0.85; // 85%-115% of slice
      const thisSlice = Math.round(sliceSize * jitter);

      const order = await this.client.createOrder({
        tokenId,
        price: limitPrice,
        size: thisSlice,
        side,
      });
      await this.client.postOrder(order);

      if (i < slices - 1) {
        await new Promise(r => setTimeout(r, intervalMs + Math.random() * 10_000));
      }
    }
  }
}
```

### News Agent → Market Price Lookup
```typescript
async function getActiveMarketsWithPrices() {
  const res = await fetch('https://gamma-api.polymarket.com/markets?closed=false&limit=50');
  const markets = await res.json();

  return markets.map(m => ({
    id: m.id,
    question: m.question,
    yesPrice: parseFloat(m.tokens?.[0]?.price ?? '0'),
    noPrice: parseFloat(m.tokens?.[1]?.price ?? '0'),
    volume: m.volume,
    category: m.category,
  }));
}
```

## Rate Limits

- **General REST**: 15,000 requests / 10 seconds
- **CLOB general**: 9,000 / 10s
- **POST /order**: 3,500/10s burst, 36,000/10min sustained
- **Gamma API**: 4,000 / 10s
- **Data API**: 1,000 / 10s
- **Enforcement**: Cloudflare throttling (delayed, not rejected — graceful degradation)
- **WebSocket**: No token subscription limit (removed Jan 2026)

## Token Allowances (Required Before Trading)

Before placing orders with an EOA wallet, you must approve the CTF Exchange contract to spend your USDC:

```typescript
import { ethers } from "ethers";

const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"; // Polygon USDC
const CTF_EXCHANGE = "0x..."; // Polymarket CTF Exchange address

const usdc = new ethers.Contract(USDC_ADDRESS, erc20Abi, signer);
await usdc.approve(CTF_EXCHANGE, ethers.constants.MaxUint256);
```

## Gotchas & Risks

1. **ethers v5 required**: The `@polymarket/clob-client` uses ethers v5.x, NOT v6. If your project uses v6, you'll have version conflicts.
2. **Token IDs, not market IDs**: The CLOB API works with individual token IDs (YES token, NO token), not market/event IDs. Get token IDs from the Gamma API.
3. **Proxy wallet complexity**: If using a Polymarket.com account, the funder/signature_type setup is tricky. For hackathon, using a standalone EOA (type 0) is simplest.
4. **USDC on Polygon**: You need USDC on Polygon mainnet to trade. For testnet/demo: the CLOB doesn't have a public testnet. Consider using Mumbai fork or mocking.
5. **No public testnet**: Polymarket CLOB is mainnet only. For hackathon demo, you may need to: (a) use real USDC on Polygon with small amounts, or (b) simulate/mock the CLOB interaction.
6. **`accepting_orders` field**: Always check this before submitting. Some markets temporarily pause order acceptance.
7. **`tick_size` and `minimum_order_size`**: Markets have minimum sizes and price increments. Check these before placing orders.
8. **NewsAPI for the agent**: Use NewsAPI.org (free tier: 100 requests/day, 24h delay on free plan). Consider caching.
