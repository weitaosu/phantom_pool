# DarkPool.trade — Demo Guide

Step-by-step instructions for demoing the product to hackathon judges. Total demo time: ~5 minutes.

---

## Pre-Demo Setup (Do This 30 Minutes Before)

### 1. Start the Backend

```bash
cd backend
# .env should already be populated with all keys (OpenRouter, Polymarket, Telegram, etc.)
# If not, copy from root: cp ../.env .env
npm install
npm run dev
```

The `.env` is pre-configured with:
- OpenRouter API key (AI features)
- Polymarket CLOB credentials (real order execution)
- Telegram bot token (live bot)
- NewsAPI key (real news headlines)
- All wallet keys (Polygon, TRON, Solana, Filecoin)
- Alchemy RPC URL (Polygon testnet)

Verify: open `http://localhost:3001/health` — should show `{"status":"ok",...}`

### 2. Smart Contracts (Already Deployed)

Contracts are already deployed and addresses are in `.env`:
- **Polygon (local Hardhat):** `DarkPoolArbiter` at `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- **TRON (Nile testnet):** `DarkPoolTron` at `TVm22VuHmhxAuxN9f1LfpmrJTWS8aAYG9R`
- **Solana (devnet):** Program ID `BxuyonCEw9nnh2qKPUURvx7E8mDJ2CGH1jenxhpjsriC`

To redeploy Polygon contracts from scratch:
```bash
cd contracts && npm install && npx hardhat run scripts/deploy.js
# Update DARK_POOL_ARBITER_ADDRESS and MOCK_USDC_ADDRESS in .env
```

### 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Verify: open `http://localhost:3000` — dashboard should load with market data.

### 4. Start the Telegram Bot

```bash
cd bot
npm install
# .env already has TELEGRAM_BOT_TOKEN configured
npm run dev
```

### 5. Seed Demo Orders

Open a second terminal and pre-load orders so matching works instantly during demo:

```bash
# Seed a SELL order (counterparty for the demo BUY)
curl -X POST http://localhost:3001/api/orders/submit \
  -H "Content-Type: application/json" \
  -d '{
    "commitHash": "0xaaaaaaaabbbbbbbbccccccccddddddddeeeeeeeeffffffff0000000011111111",
    "traderAddress": "0xDemoSeller",
    "chain": "polygon",
    "market": "fed-rate-cut-q2-2026",
    "isYes": false,
    "sizeUsdc": "10000000000",
    "limitPriceBps": 6000,
    "expiryTimestamp": 9999999999
  }'

# Seed another SELL for a different market
curl -X POST http://localhost:3001/api/orders/submit \
  -H "Content-Type: application/json" \
  -d '{
    "commitHash": "0x1111111122222222333333334444444455555555666666667777777788888888",
    "traderAddress": "0xDemoSeller2",
    "chain": "polygon",
    "market": "btc-100k-2026",
    "isYes": false,
    "sizeUsdc": "5000000000",
    "limitPriceBps": 4000,
    "expiryTimestamp": 9999999999
  }'
```

### 6. Verify Everything Works

- [ ] `http://localhost:3001/health` returns `{"status":"ok","llmProvider":"openrouter/openai/gpt-4o-mini",...}`
- [ ] `http://localhost:3001/api/markets` returns real Polymarket market list
- [ ] `http://localhost:3001/api/news/signals` returns signals (mock or live depending on NewsAPI)
- [ ] `http://localhost:3001/api/orders` shows 2 seeded orders
- [ ] `http://localhost:3000` shows dashboard with market data
- [ ] Telegram bot responds to `/start`

---

## Demo Script (5 Minutes)

### Slide 1: The Problem (30 seconds)

**Say:** "Every time a whale trades on Polymarket, the price jumps before their order fills. A $50,000 buy causes 9 cents of slippage — that's $4,500 lost to front-runners. We built a dark pool to fix this."

**Show:** Open `presentation.md` "The Problem" section or a slide with the transparent vs dark pool comparison.

---

### Slide 2: Dashboard — Live Markets (30 seconds)

**Show:** `http://localhost:3000`

**Point out:**
- "Here's our dashboard showing live Polymarket markets with prices and volume."
- "On the right, we have Gemini Prediction Markets data — same events, different prices."
- "The Cross-Venue panel flags arbitrage opportunities. When Gemini says 72 cents and Polymarket says 65 cents, our agent can capture that spread privately."

---

### Slide 3: Submit an Order via the Dashboard (45 seconds)

**Show:** Navigate to `http://localhost:3000/trade`

**Walk through the wizard:**

1. **Step 1 — Market:** Type "fed rate cut" → click Next
2. **Step 2 — Details:** Select YES, enter $10,000, leave limit as auto → click Review
3. **Step 3 — Review:** "Notice what's shown: market, side, size, limit. But on-chain, only a hash will appear — no details visible."
4. **Step 4 — Commit:** Click "Commit Order" → green checkmark appears

**Say:** "Order committed. The matching engine is now searching for a counterparty."

---

### Slide 4: Instant Match (30 seconds)

**Show:** Navigate to `http://localhost:3000/dashboard`

**Point out:**
- The order table shows the new order and the seeded counterparty
- Status should show MATCHED (the matching engine paired them instantly because we seeded a counterparty)

**Say:** "The matching engine found a counterparty at 65 cents — midpoint pricing between buyer and seller. Settlement happened atomically through our Alkahest escrow arbiter. No one on-chain saw the order size or direction."

---

### Slide 5: Telegram Bot (45 seconds)

**If bot is running, open Telegram on your phone:**

1. Send: `I want to buy 5000 of yes on the btc 100k market`
2. Bot responds with order summary (market, price, size, limit)
3. Reply: `yes`
4. Bot confirms: "Order committed to dark pool!"
5. Send: `/status` to see active orders

**Say:** "Traders can submit orders in plain English via Telegram. Our LLM (via OpenRouter) extracts the intent — market, side, size, limit — and submits it through the dark pool. No web3 wallet needed for the demo."

**If bot is NOT running, show the conversation flow from `presentation.md` instead.**

---

### Slide 6: AI News Agent (30 seconds)

**Show:** `http://localhost:3001/api/news/signals` in the browser

**Point out the signal data:**
- Article headline that triggered the signal
- Affected market
- Edge calculation (current price vs estimated post-news probability)
- Confidence score
- Action taken (BUY_YES / BUY_NO)

**Say:** "Our AI agent monitors news feeds, runs LLM analysis (via OpenRouter), and calculates whether there's a profitable edge. If the edge exceeds 2%, it routes the trade through the dark pool first — getting better fills before the market reacts."

---

### Slide 7: x402 Agentic Payments (30 seconds)

**Show in terminal:**

```bash
# Show the 402 response (POST without payment header triggers 402)
curl -s -X POST http://localhost:3001/api/solana/orders/submit \
  -H "Content-Type: application/json" \
  -d '{"commitHash":"0xtest","traderAddress":"0xAgent"}' | python -m json.tool
```

**Point out:** The 402 response with x402 payment requirements (scheme, network, price, payTo address).

**Say:** "Any AI agent can access the dark pool by paying 10 cents on Solana — no API keys, no subscriptions, no human approval. This is the x402 protocol: HTTP 402 Payment Required, settled on-chain."

---

### Slide 8: Filecoin Agent Memory (30 seconds)

**Show:** `http://localhost:3001/api/agent/reputation` in the browser

**Point out:**
- Agent ID (Filecoin CID)
- Accuracy, total trades, correct predictions
- Storage backend (filecoin-calibnet or local-memory)

**Say:** "Every decision the agent makes is stored on Filecoin. This creates a verifiable, CID-backed reputation trail. You can query the CID and verify our agent's historical accuracy — no database, just immutable decentralized storage."

---

### Slide 9: Smart Contracts (30 seconds)

**Show in terminal:**

```bash
cd contracts && npx hardhat test
```

**Point out:** 10 passing tests — commit, reveal, match, settle, cancel.

**Say:** "The DarkPoolArbiter contract implements all four phases: commit a hash, reveal details with USDC escrow, matching engine records the match, atomic settlement. We also have contracts deployed on TRON (Nile testnet) and a Solana Anchor program."

---

### Slide 10: Close (15 seconds)

**Say:** "Same system. Eight bounties. One unified dark pool for prediction markets. We bring TradFi's most important infrastructure — dark pools — to the fastest-growing category in crypto."

---

## Fallback Plans

| If this breaks... | Do this instead |
|---|---|
| Backend won't start | Show the test results: `cd backend && npx vitest run` (17 passing) |
| Frontend won't load | Demo via curl commands against the API directly |
| Telegram bot fails | Show the conversation mockup from `presentation.md` |
| Contract deploy fails | Show `npx hardhat test` (10 passing) — contracts work locally |
| Polymarket API is down | All feeds have mock fallbacks — dashboard still shows data |
| OpenRouter API rate limited | News agent has mock analysis — signals still appear |
| No internet at venue | Everything runs locally — contracts on Hardhat, mocks for all APIs |

---

## Useful URLs During Demo

| What | URL |
|------|-----|
| Dashboard | `http://localhost:3000` |
| Trade page | `http://localhost:3000/trade` |
| Order dashboard | `http://localhost:3000/dashboard` |
| Health check | `http://localhost:3001/health` |
| All orders | `http://localhost:3001/api/orders` |
| Markets | `http://localhost:3001/api/markets` |
| Gemini events | `http://localhost:3001/api/gemini/events` |
| Cross-venue arb | `http://localhost:3001/api/gemini/cross-venue` |
| News signals | `http://localhost:3001/api/news/signals` |
| Agent reputation | `http://localhost:3001/api/agent/reputation` |
| Agent memory log | `http://localhost:3001/api/agent/memory` |
| x402 demo (402 response) | `POST http://localhost:3001/api/solana/orders/submit` (no payment header → 402) |

---

## Quick Recovery Commands

```bash
# Restart backend
cd backend && npm run dev

# Re-seed demo orders (run after backend restart)
curl -X POST http://localhost:3001/api/orders/submit -H "Content-Type: application/json" \
  -d '{"commitHash":"0xaaaa","traderAddress":"0xSeller","chain":"polygon","market":"fed-rate-cut","isYes":false,"sizeUsdc":"10000000000","limitPriceBps":6000,"expiryTimestamp":9999999999}'

# Run tests as proof (if nothing else works)
cd backend && npx vitest run     # 17 passing
cd contracts && npx hardhat test  # 10 passing

# Run backtest log (Polymarket deliverable)
cd backtest && npx tsx newsAgentBacktest.ts
```
