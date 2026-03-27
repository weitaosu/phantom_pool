# DarkPool.trade — 4-Person Work Delegation

**Each person works independently. Merge points marked with arrows.**

---

## Integration Contract (READ FIRST)

All 4 workstreams communicate through these shared interfaces:

```
Shared .env keys:        ALCHEMY_RPC_URL, OPENAI_API_KEY, TELEGRAM_BOT_TOKEN, etc.
Shared types file:       backend/src/types/orders.ts (Person 2 owns this, others import)
Matching engine API:     POST /api/orders/submit, GET /api/orders/:id (Person 2 owns)
Chain event format:      { orderId, market, isYes, size, limitPrice, state } (Person 1 defines)
```

**Critical merge points (do these together at hour 18 and hour 30):**
- Hour 18: Person 1's deployed contracts + Person 2's chain listener
- Hour 30: Person 3's news agent + Person 4's bot connected to Person 2's API

---

## Person 1: Smart Contracts & Multi-Chain

**Bounties covered:** Arkhai, TRON DeFi, TRON AI/Agentic, Solana Prediction Market

### What you own
```
contracts/
├── DarkPoolArbiter.sol          ← Alkahest arbiter (Polygon/Sepolia)
├── interfaces/
│   └── ICTFExchange.sol
├── mocks/
│   ├── MockUSDC.sol
│   └── MockCTFExchange.sol
├── tron/
│   └── DarkPoolTron.sol         ← TRON DeFi + AI bounties
├── test/
│   └── DarkPool.test.js
└── hardhat.config.js

programs/dark_pool/              ← Solana Anchor program
├── src/lib.rs
└── Cargo.toml
```

### Hour-by-hour

| Hours | Task | Deliverable |
|-------|------|-------------|
| 0-2 | Setup Hardhat + Alkahest local (`npx alkahest deploy-local`) | Compiling env |
| 2-6 | Write `DarkPoolArbiter.sol` implementing IArbiter | Arbiter contract |
| 6-8 | Hardhat tests: commit, reveal, match, settle via Alkahest | >80% coverage |
| 8-9 | Deploy to Sepolia (Alkahest testnet) | Deployed address → `.env` |
| 9-12 | `DarkPoolTron.sol` in TronIDE — market maker deposit/withdraw + matching | TRON contract |
| 12-14 | Deploy to Nile testnet, test with TronLink | Deployed address |
| 14-18 | Anchor program: `commit_order`, `reveal_order`, `settle_match` | Solana program |
| 18-20 | Deploy Anchor to devnet | Deployed program ID |
| 20-22 | TRON multi-sig permission setup for agent wallet (TRON AI bounty) | Permission config |
| 22-24 | Integration testing with Person 2's chain listener | End-to-end settled tx |

### What you hand off
- Contract addresses + ABIs → Person 2 (for chain listener)
- TRON contract address → Person 4 (for TRON dashboard page)
- Event signatures → Person 2 (what events to listen for)

### Key decisions you make
- Alkahest escrow obligation/demand types for our use case
- Solana PDA seed structure
- TRON permission_id scheme for agent wallet

---

## Person 2: Backend — Matching Engine, API, x402

**Bounties covered:** Solana x402, TRON AI/Agentic (x402-TRON), core infrastructure for all bounties

### What you own
```
backend/
├── src/
│   ├── server.ts                 ← Express API server
│   ├── types/
│   │   └── orders.ts             ← SHARED TYPE DEFINITIONS (you own these)
│   ├── matching/
│   │   ├── OrderBook.ts          ← In-memory + Redis order book
│   │   └── Matcher.ts            ← Price-time priority matching algo
│   ├── chain/
│   │   ├── alkahestListener.ts   ← Listen for Alkahest escrow events
│   │   ├── solanaListener.ts     ← Listen for Solana program events
│   │   └── Settler.ts            ← Call contracts to settle matches
│   ├── iceberg/
│   │   └── IcebergQueue.ts       ← Bull job queue for iceberg slices
│   ├── middleware/
│   │   ├── x402Solana.ts         ← @x402/express middleware
│   │   └── x402Tron.ts           ← Custom TRON x402 middleware
│   ├── solana/
│   │   └── dflowClient.ts        ← DFlow/Kalshi API client
│   └── routes/
│       ├── orders.ts
│       └── markets.ts
├── test/
└── package.json
```

### Hour-by-hour

| Hours | Task | Deliverable |
|-------|------|-------------|
| 0-2 | Setup Express + Redis + Bull + ethers.js + @x402/express | Boilerplate running |
| 2-4 | Define `orders.ts` shared types, push to repo | Shared types (OTHERS DEPEND ON THIS) |
| 4-8 | `OrderBook.ts` + `Matcher.ts` with price-time priority | Matching engine |
| 8-10 | Unit tests for matching logic (edge cases: partial fills, no match) | Test suite |
| 10-14 | `alkahestListener.ts` — listen for escrow events from Person 1's contract | Chain listener |
| 14-16 | `Settler.ts` — call `DarkPoolArbiter.recordAndFulfillMatch()` | Settlement flow |
| 16-18 | `IcebergQueue.ts` — Bull jobs with Polymarket CLOB API | Iceberg execution |
| 18-20 | **MERGE with Person 1:** Connect listener → deployed Sepolia contract | End-to-end match |
| 20-22 | `x402Solana.ts` — wrap `/api/solana/orders/submit` with @x402/express | x402 Solana bounty |
| 22-24 | `x402Tron.ts` — custom middleware verifying TRC-20 payment on-chain | x402 TRON bounty |
| 24-26 | `dflowClient.ts` — DFlow API for Kalshi SPL market settlement | Solana markets bounty |
| 26-28 | Deploy to Railway, set env vars | Live backend |

### What you hand off
- API URL + endpoints → Person 3 (news agent submits orders here)
- API URL + endpoints → Person 4 (bot and frontend call this)
- `orders.ts` types → Everyone (shared data model)

### Key decisions you make
- Redis schema for order book
- API endpoint shapes
- Iceberg slice timing/jitter algorithm
- x402 pricing (you set the $/order)

---

## Person 3: AI Agent — News, Gemini, Filecoin

**Bounties covered:** Polymarket (news agent), Gemini (cross-venue), Filecoin (agent memory)

### What you own
```
backend/
├── src/
│   ├── agent/
│   │   ├── newsAgent.ts          ← Core news-driven trading agent
│   │   ├── edgeCalculator.ts     ← Kelly criterion position sizing
│   │   └── backtester.ts         ← Generate required backtest logs
│   ├── feeds/
│   │   ├── geminiPriceFeed.ts    ← Gemini Prediction Markets API
│   │   ├── polymarketFeed.ts     ← Polymarket price data
│   │   └── crossVenueArb.ts     ← Arb detection across venues
│   └── filecoin/
│       └── agentStorage.ts       ← Synapse SDK: logs, identity, reputation

backtest/
└── newsAgentBacktest.ts          ← Polymarket bounty required deliverable
```

### Hour-by-hour

| Hours | Task | Deliverable |
|-------|------|-------------|
| 0-2 | Setup: OpenAI SDK, NewsAPI key, Gemini API test calls, Synapse SDK | API access confirmed |
| 2-4 | `polymarketFeed.ts` — fetch active markets, current prices | Price feed |
| 4-8 | `newsAgent.ts` — RSS + NewsAPI polling → GPT-4o analysis → signal gen | News agent core |
| 8-10 | `edgeCalculator.ts` — Kelly criterion sizing, edge threshold logic | Position sizing |
| 10-12 | Wire newsAgent to submit orders to Person 2's API (`POST /api/orders/submit`) | Agent → dark pool |
| 12-16 | `geminiPriceFeed.ts` — Gemini Prediction Markets API client | Gemini data feed |
| 16-18 | `crossVenueArb.ts` — GPT-4o semantic matching + arb detection | Gemini bounty core |
| 18-22 | `agentStorage.ts` — Synapse SDK setup, agent registration, log/memory hooks | Filecoin bounty |
| 22-26 | `backtester.ts` — generate backtest log against historical news events | Polymarket deliverable |
| 26-28 | Reputation report endpoint: accuracy stats from Filecoin CIDs | Filecoin bounty |
| 28-30 | **MERGE with Person 4:** Connect arb alerts + agent activity to dashboard | Dashboard integration |

### What you hand off
- `GET /api/news/signals` endpoint → Person 4 (for dashboard Agent Activity panel)
- `GET /api/gemini/cross-venue` endpoint → Person 4 (for Cross-Venue Intel panel)
- `GET /api/agent/reputation` endpoint → Person 4 (for Filecoin reputation display)
- Backtest log file → submission package (Polymarket bounty)

### Key decisions you make
- News sources (RSS feeds, NewsAPI categories)
- GPT-4o system prompt for market matching
- Edge threshold (2%? 5%?)
- Filecoin data schema (what to store, what to omit for privacy)

---

## Person 4: Telegram Bot & Frontend Dashboard

**Bounties covered:** Solana Smart Accounts (Swig), demo UX for all bounties

### What you own
```
bot/
├── src/
│   ├── index.ts                  ← grammy bot entrypoint
│   ├── handlers/
│   │   ├── rfq.ts                ← RFQ order flow (natural language → trade)
│   │   ├── status.ts             ← /status, /history commands
│   │   └── swigControls.ts       ← /agent-status, /agent-pause, /approve, /set-limit
│   └── ai/
│       └── intentExtractor.ts    ← GPT-4o intent parsing

frontend/
├── app/
│   ├── page.tsx                  ← Market browser (Polymarket + Gemini prices)
│   ├── trade/page.tsx            ← Alkahest escrow wizard (order form)
│   ├── dashboard/page.tsx        ← Orders + agent activity + Filecoin CIDs
│   └── tron/page.tsx             ← TRON two-role DeFi demo page
├── components/
│   ├── OrderForm.tsx
│   ├── OrderTable.tsx
│   ├── MarketCard.tsx
│   ├── CrossVenuePanel.tsx       ← Gemini arb data
│   ├── AgentActivityPanel.tsx    ← News signals + trades
│   ├── IcebergProgress.tsx
│   └── SwigControlPanel.tsx      ← Smart account management
└── package.json
```

### Hour-by-hour

| Hours | Task | Deliverable |
|-------|------|-------------|
| 0-2 | Setup: grammy + Next.js 15 + wagmi + shadcn + Vercel | Boilerplate |
| 2-6 | `rfq.ts` — full RFQ flow: DM → GPT-4o intent → confirm → submit to API | Telegram order flow |
| 6-8 | `intentExtractor.ts` — GPT-4o structured output for order parsing | Intent extraction |
| 8-10 | `status.ts` — /status, /history, /cancel commands | Bot commands |
| 10-14 | Next.js: `page.tsx` (market browser) + `trade/page.tsx` (order form wizard) | Frontend core |
| 14-18 | `dashboard/page.tsx` — OrderTable + IcebergProgress + WebSocket updates | Dashboard |
| 18-20 | `tron/page.tsx` — two-role TRON demo: trader + market maker UX | TRON DeFi bounty UX |
| 20-24 | `CrossVenuePanel.tsx` + `AgentActivityPanel.tsx` (consume Person 3's endpoints) | Gemini + Filecoin panels |
| 24-28 | `swigControls.ts` — Swig SDK provisioning, /agent-status, /set-limit, /approve | Solana smart acct bounty |
| 28-30 | `SwigControlPanel.tsx` — web version of Swig management | Dashboard panel |
| 30-32 | Deploy: Telegram webhook, Vercel frontend, test end-to-end | Live bot + site |
| 32-36 | Polish: error states, loading skeletons, mobile responsive | Demo-ready |

### What you hand off
- Demo-ready Telegram bot URL → submission package
- Vercel URL → submission package
- TRON page screenshots → TRON bounty submission

### Key decisions you make
- Bot conversation UX (how many confirmations before submit?)
- Dashboard layout / panel arrangement
- Swig role configuration (spend limits, whitelists)

---

## Dependency Graph

```
                  Person 1 (Contracts)
                  ├── Deploys contracts
                  └── Provides addresses + ABIs
                         │
                         ▼ (hour 18 merge)
                  Person 2 (Backend)
                  ├── Chain listener connects to contracts
                  ├── Matching engine + API server
                  └── x402 middleware
                       │           │
            ┌──────────┘           └──────────┐
            ▼ (hour 12)                       ▼ (hour 30 merge)
     Person 3 (AI Agent)              Person 4 (Bot + Frontend)
     ├── Submits orders to API        ├── Submits orders to API
     ├── Gemini + Filecoin            ├── Consumes agent/arb endpoints
     └── Provides data endpoints      └── TRON UX + Swig controls
```

## Shared Environment (.env.example)

```bash
# Person 1 fills these after deploy:
DARK_POOL_ARBITER_ADDRESS=
ALKAHEST_ADDRESS=
DARK_POOL_TRON_ADDRESS=
SOLANA_PROGRAM_ID=

# Person 2 needs:
ALCHEMY_RPC_URL=
REDIS_URL=redis://localhost:6379
POLYMARKET_API_KEY=
POLYMARKET_SECRET=
EXECUTION_PRIVATE_KEY=

# Person 3 needs:
OPENAI_API_KEY=
NEWSAPI_KEY=
FILECOIN_SYNAPSE_KEY=

# Person 4 needs:
TELEGRAM_BOT_TOKEN=
NEXT_PUBLIC_API_URL=http://localhost:3001

# Shared:
MATCHING_ENGINE_PRIVATE_KEY=
```

## Go/No-Go Checkpoints

| Hour | Check | Who decides | If NO |
|------|-------|-------------|-------|
| 10 | Do contracts compile + pass tests? | Person 1 | Fall back to simple DarkPool.sol without Alkahest |
| 14 | Does matching engine produce correct results? | Person 2 | Simplify: remove partial fills, price-time → FIFO |
| 18 | Can listener read events from deployed contract? | Person 1 + 2 | Use Hardhat local fork instead of testnet |
| 24 | Does news agent generate sensible signals? | Person 3 | Hardcode 3 demo signals, skip live RSS |
| 30 | Does bot submit + see orders end-to-end? | Person 4 + 2 | Record demo with pre-seeded orders |
| 36 | Is everything deployed + working? | ALL | Cut P4 (Swig), simplify frontend, focus on demo |

## Demo Ownership

| Submission | Who records the demo video |
|------------|---------------------------|
| Polymarket (news agent) | Person 3 |
| Arkhai (Alkahest) | Person 1 |
| Solana (prediction market) | Person 1 |
| Solana (x402) | Person 2 |
| TRON (DeFi) | Person 4 |
| TRON (AI/Agentic) | Person 2 |
| Gemini (cross-venue) | Person 3 |
| Filecoin (agent memory) | Person 3 |
| Solana (smart accounts) | Person 4 |
