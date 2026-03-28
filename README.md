# DarkPool.trade

Privacy-preserving dark pool for prediction markets. Trade large positions without revealing size or direction on-chain.

## Problem

On transparent prediction markets (Polymarket, Gemini, Kalshi), large trades signal insider activity through immediate price movement. Front-running bots extract value from every visible order.

## Solution

A commit-reveal dark pool that:
1. Accepts orders as opaque hashed commitments (nothing visible on-chain)
2. Matches buyers and sellers off-chain using price-time priority
3. Settles matched pairs atomically through Alkahest conditional escrows
4. Executes unmatched residuals as iceberg orders (small timed slices)

An AI news agent monitors headlines, calculates predictive edge via LLM (OpenRouter GPT-4o-mini), and routes trades through the dark pool first.

## Architecture

```
Telegram Bot / Web UI
       |
   API Server (Express + WebSocket)
       |
   Matching Engine (price-time priority)
       |
  +----+----+----+
  |         |         |
Polygon   Solana    TRON
(Alkahest) (DFlow)  (USDT)
```

## Deployed Contracts

| Chain | Contract | Address |
|-------|----------|---------|
| Polygon (local) | DarkPoolArbiter | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| Polygon (local) | MockUSDC | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| TRON Nile | DarkPoolTron | `TVm22VuHmhxAuxN9f1LfpmrJTWS8aAYG9R` |
| Solana Devnet | dark_pool (Anchor) | `BxuyonCEw9nnh2qKPUURvx7E8mDJ2CGH1jenxhpjsriC` |

## Bounties Targeted (8)

| Bounty | Sponsor | Component |
|--------|---------|-----------|
| Autonomous News-Driven Trading Agent | Polymarket | News agent + dark pool execution |
| Best Prediction Market on Solana | Solana | Anchor program + DFlow settlement |
| Build on Arkhai | Arkhai | Alkahest conditional escrow arbiter |
| Payments & DeFi Product Demo | TRON | Two-role dark pool (trader + MM) |
| AI & Agentic Commerce | TRON | x402-style micropayments + multi-sig |
| Best Use of Gemini Prediction Markets API | Gemini | Cross-venue arb detection |
| Best Use of Agentic Payments with x402 | Solana | x402 paywall on matching API |
| Decentralized Infrastructure for Self-Sustaining AI | Filecoin | Agent memory via Synapse SDK |

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/weitaosu/penn_hackathon.git
cd penn_hackathon

# 2. Backend (.env is pre-configured with all keys)
cd backend && npm install
npm run dev   # starts on :3001

# 3. Smart contract tests (separate terminal)
cd contracts && npm install
npx hardhat test          # 10 tests passing

# 4. Telegram bot (separate terminal)
cd bot && npm install
npm run dev               # bot token already in .env

# 5. Frontend (separate terminal)
cd frontend && npm install
npm run dev               # starts on :3000
```

## Project Structure

```
contracts/              Smart contracts (Polygon + TRON)
  src/DarkPoolArbiter.sol Commit-reveal + escrow arbiter (10 tests)
  tron/DarkPoolTron.sol   TRON dark pool with market maker role
  test/                   Hardhat tests
  scripts/                Deploy scripts (Polygon + TRON)

programs/dark_pool/     Solana Anchor program
  src/lib.rs              Commit/reveal/settle instructions
  Anchor.toml             Workspace config (program ID: Bxuyon...)

backend/                API server + matching engine
  src/matching/           OrderBook + Matcher (price-time priority)
  src/chain/              Alkahest + Solana event listeners, Settler
  src/iceberg/            Iceberg queue with Polymarket CLOB integration
  src/llm/                Shared LLM client (OpenRouter + OpenAI fallback)
  src/middleware/          x402 payment middleware (Solana + TRON)
  src/agent/              News-driven trading agent
  src/feeds/              Gemini Prediction Markets API client
  src/filecoin/           Agent storage via Synapse SDK
  src/routes/             REST API endpoints
  test/                   17 unit tests (Vitest)

bot/                    Telegram bot
  src/handlers/rfq.ts     Natural language order flow
  src/ai/                 OpenRouter LLM intent extraction

frontend/               Next.js dashboard
  app/page.tsx            Market browser + arb detection + agent activity
  app/trade/page.tsx      Order submission wizard
  app/dashboard/page.tsx  Orders table + Filecoin reputation

backtest/               Polymarket bounty deliverable
  newsAgentBacktest.ts    Simulated trading log (+23.5% return)
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/orders/submit` | Submit dark pool order |
| POST | `/api/orders/reveal` | Reveal committed order |
| GET | `/api/orders/:id` | Order status |
| GET | `/api/markets` | Browse Polymarket markets |
| GET | `/api/gemini/events` | Gemini prediction markets |
| GET | `/api/gemini/cross-venue` | Cross-venue arb opportunities |
| GET | `/api/news/signals` | AI agent trade signals |
| GET | `/api/agent/reputation` | Filecoin-backed reputation |
| GET | `/api/agent/memory` | Agent decision log |
| POST | `/api/solana/orders/submit` | x402-gated (Solana) |
| POST | `/api/tron/orders/submit` | x402-gated (TRON) |
| GET | `/health` | Health check + LLM provider info |
| WS | `/ws` | Real-time order events |

## Tech Stack

- **Smart Contracts:** Solidity 0.8.20 (Hardhat), Anchor 0.32 (Solana), TronIDE (TRON)
- **Backend:** Node.js, Express, TypeScript, ethers.js v6, @solana/web3.js
- **AI:** OpenRouter (GPT-4o-mini) — news analysis + intent extraction
- **Bot:** grammy.js (Telegram) with NLP order flow
- **Frontend:** Next.js 15, React 19
- **Testing:** Vitest (17 tests), Hardhat/Chai (10 tests)
- **Infra:** Redis, Railway, Vercel

## Test Results

```
Backend:   17/17 passing (Vitest)
Contracts: 10/10 passing (Hardhat)
TypeScript: 0 compilation errors
Backtest:  5 trades, +23.5% return, 100% win rate
```

## Configured Services

All keys are in `.env` — no setup needed:
- OpenRouter (GPT-4o-mini) — AI features
- Polymarket CLOB — real order execution
- Telegram Bot — live at @DarkPoolTradeBot
- NewsAPI — real-time news headlines
- Alchemy — Polygon RPC
- Wallets — Polygon, TRON, Solana, Filecoin

## Team

Built at University of Pennsylvania Blockchain Hackathon '26.
