# Phantom Pool — Demo Script

## The Big Picture

Phantom Pool is a **privacy-preserving dark pool for prediction markets**. The core problem: on transparent markets like Polymarket, large orders get front-run by MEV bots. Phantom Pool solves this with three mechanisms:

1. **Commit-reveal** — hash your order on-chain before revealing details
2. **Iceberg orders** — split large orders into small, jittered slices
3. **Off-chain matching** — match counterparties privately, settle atomically

It's powered by an **AI news agent** that scans headlines, detects trading edge, and routes signals through the dark pool first. Settlement spans **Polygon, Solana, and TRON** with x402 micropayments.

---

## Tab-by-Tab

### 1. Home (`/`) — Market Browser

This is the entry point. You see a **live price marquee** scrolling across the top and a grid of prediction market cards pulled from **Polymarket** and **Gemini**. Each card shows:

- The market question (e.g. "Will BTC exceed $100k before April 2026?")
- Live YES/NO prices that tick in real-time (green flash = up, red = down)
- 24h volume, sentiment indicator (bull/bear/neutral)

Toggle between **POLYMARKET** and **GEMINI** tabs to show cross-venue data. Click any card to enter the trade flow.

---

### 2. Dashboard (`/dashboard`) — Live Terminal Monitor

Three-panel terminal view showing the engine in action:

- **Left panel — AI Sentiment**: rotating news headlines color-coded by sentiment (green=bullish, red=bearish, purple=neutral), plus a knowledge graph of market correlations
- **Center panel — Iceberg Engine**: the animated iceberg visualization with particles crossing the waterline, the "DARK MATCH" button that triggers the matching engine, the 4-step settlement sequence animation (Lock → Verify → Release → Settled), and a terminal-style execution log showing live fills (timestamp, side, symbol, size, slippage)
- **Right panel — Market Feed**: top-5 price tickers, order book depth chart with bid/ask bars and buy pressure indicator, and session stats (total fills, cumulative volume)

Everything updates via WebSocket — when a match happens, the exec log gets a new entry, settlement animates, and counters tick up.

---

### 3. Trade (`/trade`) — Order Submission Wizard

The core flow. Three sections: iceberg preview (left), 4-step wizard (center), order summary (right).

- **Step 1 — Configure**: pick your market, choose YES or NO, set size in USDC and limit price in cents
- **Step 2 — Iceberg**: set the visible slice size (e.g. $1K out of a $10K order = 10 slices) and timing jitter (Low/Medium/High/Random). The left panel's iceberg visualization updates live — higher jitter pushes the waterline down, hiding more of the order
- **Step 3 — Commit**: shows the salted commit hash (64-char hex). Clicking "Sign & Commit" calls `submitOrder()` on the backend — the hash goes on-chain but no funds move yet
- **Step 4 — Reveal & Settle**: the settlement sequence animates through Lock → Verify → Release → Settled. The checklist updates as the backend progresses. "BROADCAST REVEAL" sends the reveal transaction. Once settled, step 4 turns green

The right panel always shows order summary: market, side, size, limit, ice slice, type (DARK ICEBERG), chain (Polygon).

---

### 4. Agent (`/agent`) — AI News Agent

Three columns showing the LLM-powered trading agent:

- **Left — Agent Reputation**: accuracy percentage (e.g. 72%), stat grid (signals today, markets monitored, avg edge, est. PnL), win/loss bar chart, last scan timestamp, agent ID, Filecoin CIDs where signals are stored on IPFS
- **Center — News Signals Feed**: a scanning animation showing the LLM analyzing headlines in real-time, an arb counter (detected today + last found timestamp), and signal cards — each shows the article headline, action (BUY_YES/BUY_NO/HOLD), affected market, current vs AI-estimated price, edge spread, confidence meter, and a TRADE button that links directly to the trade wizard
- **Right — Cross-Venue Arbitrage**: live feed of Polymarket ↔ Gemini price mismatches with spread calculation, direction badge (e.g. "BUY POLY SELL GEM"), and hot arbs highlighted in orange when spread > 5¢

---

### 5. TRON (`/tron`) — x402 Payment Flow

Split-screen showing the **x402 micropayment protocol** in action:

- **Left — Trader**: TRON wallet with USDT balance, submit a dark order. First submission returns HTTP 402 (Payment Required) with payment details (amount, address, network, memo). Click "PAY & SUBMIT" to broadcast a 0.10 USDT TRC-20 transaction on TRON Nile testnet. Server verifies on-chain, then accepts the order. Transaction log shows the full lifecycle (pending → filled)
- **Right — Market Maker**: pool balance and earned fees, deposit/withdraw liquidity buttons, protocol parameters (settlement fee 0.10%, MM share 60%, min liquidity $1K, x402 fee 0.10 USDT/order), and an activity log

This demonstrates how the dark pool can be **monetized** — market makers provide liquidity, earn fees, and every order pays a micropayment verified on-chain before entering the pool.
