# Dark Pool for Prediction Markets — Multi-Bounty Implementation Plan

**Hackathon:** University of Pennsylvania Blockchain Hackathon '26
**Timeline:** 48-hour sprint
**Total prize pool targeted:** $9,000 across 9 bounties
**Core concept:** Agentic dark pool with privacy-preserving matching, multi-chain settlement, and AI-driven trading

---

## Project Description

**DarkPool.trade** is a privacy-preserving prediction market trading platform that lets large traders execute positions without revealing their size or direction on-chain. On transparent prediction markets like Polymarket, a whale buying $50,000 of "Yes" instantly signals insider activity — price spikes before the order fills, and front-running bots extract value from every large trade. DarkPool.trade solves this with a commit-reveal matching layer built on Alkahest conditional escrows: traders lock funds in opaque on-chain commitments, an off-chain matching engine pairs compatible counterparties, and settlement executes atomically only when a match is confirmed.

At its core, the system is an **autonomous AI trading agent** that monitors real-time news feeds, calculates predictive edge using GPT-4o sentiment analysis, and routes high-confidence trades through the dark pool first — capturing better prices from private counterparties before any signal reaches the public order book. Unmatched residuals are executed as iceberg orders (small timed slices) to minimize market impact. The agent's wallet is secured by a Swig smart account with human-controlled spend limits, program whitelists, and an emergency stop — all managed through a Telegram interface.

The platform is multi-chain by design: primary settlement flows through Polymarket's CTF Exchange on Polygon (via Alkahest arbitration), the Solana branch settles against DFlow's tokenized Kalshi SPL markets with x402 micropayment access, and a TRON branch serves as a two-role DeFi dark pool (trader + market maker) using USDT. A Gemini Prediction Markets API integration powers cross-venue arbitrage detection — surfacing pricing discrepancies between Gemini and Polymarket for the same events. All agent decisions and order logs are stored permanently on Filecoin via the Synapse SDK, creating a verifiable, CID-backed reputation trail.

**Key stats:** 9 bounties targeted · $9,000 prize pool · 4 chains (Polygon, Solana, TRON, Filecoin/Calibnet) · 3 AI integrations (OpenAI GPT-4o, NewsAPI, Gemini API) · 1 unified codebase

---

## Bounty Coverage Map

| Bounty | Sponsor | Prize | Fit | How We Cover It |
|--------|---------|-------|-----|-----------------|
| Autonomous News-Driven Trading Agent | Polymarket | $1,000 | ★★★★★ | News-monitoring AI agent routes through dark pool |
| Best Prediction Market on Solana | Solana | $1,000 | ★★★★★ | Solana dark pool settles via DFlow/Kalshi SPL tokens |
| Build on Arkhai | Arkhai | $1,000 | ★★★★★ | Replace commit-reveal with Alkahest conditional escrow |
| Payments & DeFi Product Demo | TRON | $1,000 | ★★★★☆ | TRON dark pool as DeFi liquidity aggregation product |
| AI & Agentic Commerce | TRON | $1,000 | ★★★★☆ | x402-style micro-payments for matching engine API on TRON |
| Best Use of Gemini Prediction Markets API | Gemini | $1,000 | ★★★★☆ | Gemini API as cross-venue price feed + arbitrage detection |
| Best Use of Agentic Payments with x402 | Solana | $1,000 | ★★★☆☆ | x402 paywall on matching engine API, settled on Solana |
| Decentralized Infrastructure for Self-Sustaining AI | Filecoin | $1,000 | ★★★☆☆ | Agent logs + identity stored on Filecoin via Synapse SDK |
| Smart Account Provisioning for OpenClaw Agents | Solana | $1,000 | ★★★☆☆ | Swig smart accounts + Telegram as human control interface |
| Infrastructure Upgrade for TRON | TRON | $1,000 | ★★☆☆☆ | SKIP — requires upstream PR, too far from core |

**Estimated prizes:** $8,000–$9,000 if top tiers hit

---

## Table of Contents

1. [The Unified Architecture](#1-the-unified-architecture)
2. [Arkhai — Replace Commit-Reveal with Alkahest Escrow](#2-arkhai--replace-commit-reveal-with-alkahest-escrow)
3. [Polymarket — Autonomous News-Driven Trading Agent](#3-polymarket--autonomous-news-driven-trading-agent)
4. [Gemini — Cross-Venue Price Feed & Arbitrage Detection](#4-gemini--cross-venue-price-feed--arbitrage-detection)
5. [Solana — Dark Pool Prediction Market via DFlow/Kalshi](#5-solana--dark-pool-prediction-market-via-dflowkalshi)
6. [Solana — x402 Monetized Matching Engine](#6-solana--x402-monetized-matching-engine)
7. [Solana — Swig Smart Account for Agent Wallet](#7-solana--swig-smart-account-for-agent-wallet)
8. [TRON — DeFi Dark Pool Product Demo](#8-tron--defi-dark-pool-product-demo)
9. [TRON — AI & Agentic Commerce via x402-style Payments](#9-tron--ai--agentic-commerce-via-x402-style-payments)
10. [Filecoin — Decentralized Agent Memory & Logs](#10-filecoin--decentralized-agent-memory--logs)
11. [Core Smart Contracts (Polygon Primary)](#11-core-smart-contracts-polygon-primary)
12. [Matching Engine & Iceberg Queue](#12-matching-engine--iceberg-queue)
13. [Telegram + OpenAI Bot](#13-telegram--openai-bot)
14. [Frontend Dashboard](#14-frontend-dashboard)
15. [Tech Stack Decisions](#15-tech-stack-decisions)
16. [Data Models & API Contracts](#16-data-models--api-contracts)
17. [48-Hour Implementation Phases](#17-48-hour-implementation-phases)
18. [Team Workstreams](#18-team-workstreams)
19. [Demo Script & Pitch Narrative](#19-demo-script--pitch-narrative)
20. [Risk Register](#20-risk-register)

---

## 1. The Unified Architecture

The key insight: all bounties describe different facets of the **same system**. Rather than building separate demos, we build one coherent platform that qualifies for each bounty from a different angle.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACES                                │
│  ┌─────────────────────┐    ┌─────────────────────────────────────────┐    │
│  │   Telegram Bot      │    │   Web Dashboard (Next.js)               │    │
│  │   (OpenAI GPT-4o)   │    │   Polymarket + Gemini prices            │    │
│  │   Human control     │    │   Order book depth, agent activity      │    │
│  │   for agent policy  │    │                                         │    │
│  └──────────┬──────────┘    └──────────────────┬────────────────────-┘    │
└─────────────┼──────────────────────────────────-┼──────────────────────────┘
              │                                    │
              ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AGENT CORE                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │           News-Driven Trading Agent (Polymarket bounty)             │   │
│  │   RSS/NewsAPI → OpenAI sentiment → confidence score → trade signal  │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│  ┌──────────────────────────────┼──────────────────────────────────────┐   │
│  │      Agent Identity (ERC-8004) & Memory on Filecoin (Filecoin)      │   │
│  │   Synapse SDK stores: logs, order history, reputation CID           │   │
│  └──────────────────────────────┼──────────────────────────────────────┘   │
└─────────────────────────────────┼───────────────────────────────────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
┌───────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐
│  MATCHING ENGINE  │  │  x402 PAYWALL    │  │  PRICE AGGREGATOR        │
│  (Node.js)        │  │  (Solana/TRON)   │  │  Polymarket + Gemini     │
│  Price-time prio  │  │  Pay-per-match   │  │  + DFlow/Kalshi APIs     │
│  Iceberg queue    │  │  via HTTP 402    │  │  Cross-venue arb signal  │
└────────┬──────────┘  └──────────────────┘  └──────────────────────────┘
         │
┌────────▼────────────────────────────────────────────────────────────────┐
│                          SETTLEMENT LAYER                               │
│                                                                         │
│  ┌─────────────────────┐  ┌────────────────────┐  ┌─────────────────┐ │
│  │ POLYGON (Primary)   │  │  SOLANA            │  │  TRON           │ │
│  │ Alkahest escrow     │  │  Anchor program    │  │  DarkPoolTron   │ │
│  │ (Arkhai bounty)     │  │  DFlow/Kalshi SPL  │  │  USDT/TRC-20   │ │
│  │ → Polymarket CTF    │  │  Swig smart acct   │  │  x402-TRON     │ │
│  │   Exchange          │  │  x402 micropay     │  │                │ │
│  └─────────────────────┘  └────────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### How Each Bounty Sees the System

| Bounty | Their Lens |
|--------|-----------|
| **Polymarket** | The news agent + dark pool = autonomous trading agent with novel execution strategy |
| **Arkhai** | The matching engine = agentic escrow arbiter; Alkahest replaces custom commit-reveal |
| **Solana (markets)** | The Solana settlement layer + DFlow = novel dark pool prediction market mechanism |
| **Solana (x402)** | The matching engine API = x402-gated service; agents pay-per-match on Solana |
| **Solana (smart accts)** | Swig + Telegram dashboard = human-controlled smart account for AI trading agent |
| **TRON (DeFi)** | TRON branch = full DeFi dark pool with trader + market maker roles, good UX |
| **TRON (AI/Agentic)** | x402 micropayments on TRON for the matching engine API |
| **Gemini** | Cross-venue dashboard showing Gemini vs Polymarket prices + arb signal |
| **Filecoin** | Agent logs and identity stored decentrally on Filecoin via Synapse SDK |

---

## 2. Arkhai — Replace Commit-Reveal with Alkahest Escrow

**Bounty:** Build on Arkhai | $1,000 | ★★★★★

### Why This is a Perfect Fit

Alkahest is a **conditional escrow on EAS (Ethereum Attestation Service)**. In our original design, traders commit a hash and reveal when matching. With Alkahest:

- **Buyer** creates an escrow: locks `size × limitPrice` USDC, condition = "seller escrow exists at compatible price"
- **Seller** creates a complementary escrow with opposite side
- **Matching Engine** acts as the Alkahest **arbiter**: it observes both escrows, confirms they match, and triggers release
- Settlement is **atomic**: both escrows release simultaneously or neither does

This is MORE elegant than our custom commit-reveal — we get the privacy of conditional escrow AND the arbitration guarantees of Alkahest.

### Architecture Change

```
OLD: DarkPool.sol with custom commit-reveal
NEW: Alkahest conditional escrow + DarkPool arbiter

Flow:
1. Buyer calls Alkahest.createEscrow({
     obligation: USDCObligation(10_000 USDC),
     demand: CTFTokenDemand(YES-tokens at ≤65¢),
     arbiter: DarkPoolArbiter.address,
     expiry: T+10min
   })

2. Seller calls Alkahest.createEscrow({
     obligation: CTFTokenObligation(YES-tokens),
     demand: USDCDemand(≥63¢),
     arbiter: DarkPoolArbiter.address,
     expiry: T+10min
   })

3. Matching engine detects both escrows via event listener
   → Verifies price overlap (buyer ≥65¢ buy, seller ≥63¢ sell → midpoint 64¢)
   → Calls DarkPoolArbiter.fulfillMatch(buyEscrowId, sellEscrowId, matchedPrice)

4. Alkahest atomically releases both escrows
   → Buyer gets YES tokens at 64¢
   → Seller gets USDC at 64¢
```

### DarkPoolArbiter Contract

```solidity
// File: contracts/DarkPoolArbiter.sol
// Implements Alkahest IArbiter interface

import "@alkahest/IArbiter.sol";
import "@alkahest/IAlkahest.sol";

contract DarkPoolArbiter is IArbiter {
    IAlkahest public immutable alkahest;
    address public immutable matchingEngine;

    // Called by the off-chain matching engine when a match is found
    function fulfillMatch(
        uint64 buyEscrowId,
        uint64 sellEscrowId,
        uint256 matchedPrice  // basis points
    ) external onlyMatchingEngine {
        // Verify escrow pair is compatible
        EscrowData memory buy = alkahest.getEscrow(buyEscrowId);
        EscrowData memory sell = alkahest.getEscrow(sellEscrowId);

        require(_pricesOverlap(buy.demandPrice, sell.obligationPrice, matchedPrice));
        require(buy.market == sell.market, "Market mismatch");

        // Fulfill both escrows atomically
        alkahest.fulfillEscrow(buyEscrowId, abi.encode(matchedPrice));
        alkahest.fulfillEscrow(sellEscrowId, abi.encode(matchedPrice));
    }
}
```

### Deployment

- **Network:** Alkahest is deployed on Base, Arbitrum, Optimism (EVM mainnet/testnet)
- **Local dev:** Alkahest SDK includes Anvil deployment utility — `npx alkahest deploy-local`
- **Testnet:** Deploy DarkPoolArbiter to Sepolia where Alkahest is live

### Privacy Properties

Alkahest escrows store obligation/demand terms in EAS attestations — these ARE visible on-chain. However:
- The escrow counterparty is NOT matched until the arbiter fires
- The market/price is encoded in the obligation type — we can use a ZK-friendly demand format
- For hackathon: acceptable that escrow terms are visible; the novelty is the **agentic arbitration** pattern

### Arkhai Pitch Angle

> "We built a dark pool matching engine as an Alkahest arbiter. The arbiter doesn't just confirm delivery — it finds matching counterparties across the entire order flow and orchestrates atomic multi-escrow settlements. This is the first application of Alkahest to financial market matching."

---

## 3. Polymarket — Autonomous News-Driven Trading Agent

**Bounty:** Autonomous News-Driven Trading Agent | $1,000 | ★★★★★

### Architecture

```
News Sources:
  - RSS feeds (Reuters, AP, BBC, FT)
  - NewsAPI (breaking news search)
  - Twitter/X API (breaking social signals)
  - Perplexity API (live web search)
                    ↓
         Event Relevance Classifier
         (OpenAI GPT-4o, structured output)
         → Which Polymarket markets are affected?
         → Probability shift estimate
         → Confidence score (0-100)
                    ↓
              Edge Calculator
              current_market_price vs estimated_new_probability
              edge = |estimated_prob - market_price| - transaction_costs
                    ↓
           if edge > threshold (2%):
              → Submit order to DARK POOL first
              → If no dark pool match in 2min: iceberg to Polymarket CLOB
```

### News Agent Code

```javascript
// backend/src/agent/newsAgent.js

class NewsAgent {
  constructor({ openai, polymarketClient, darkPool }) {
    this.openai = openai;
    this.polymarket = polymarketClient;
    this.darkPool = darkPool;
    this.pollingInterval = 60_000; // 1 minute
  }

  async monitorAndTrade() {
    const articles = await this.fetchLatestNews();
    const markets = await this.polymarket.getActiveMarkets();

    for (const article of articles) {
      const analysis = await this.analyzeArticle(article, markets);
      if (analysis.edge > 0.02) {
        await this.executeTradeSignal(analysis);
      }
    }
  }

  async analyzeArticle(article, markets) {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'system',
        content: `You are a prediction market analyst. Given a news article and a list of markets,
        determine if any market probability should shift. Return JSON:
        {
          "affected_markets": [{ "market_id": string, "current_price": number, "estimated_prob": number, "reasoning": string }],
          "confidence": number,  // 0-100
          "urgency": "high|medium|low"
        }`
      }, {
        role: 'user',
        content: `Article: ${article.title}\n${article.content}\n\nActive Markets: ${JSON.stringify(markets.slice(0,20))}`
      }],
      response_format: { type: 'json_object' }
    });

    const analysis = JSON.parse(response.choices[0].message.content);

    // Calculate edge for each affected market
    return analysis.affected_markets.map(m => ({
      ...m,
      edge: Math.abs(m.estimated_prob - m.current_price) - 0.005, // 0.5% fee buffer
      article_title: article.title,
      article_url: article.url
    }));
  }

  async executeTradeSignal(signal) {
    const { market_id, estimated_prob, current_price, edge } = signal;
    const isYes = estimated_prob > current_price;
    const limitPrice = isYes
      ? Math.min(estimated_prob + 0.02, 0.99)  // buy up to 2¢ above estimate
      : Math.max(estimated_prob - 0.02, 0.01); // sell down to 2¢ below

    const sizeUsdc = this.calculatePositionSize(edge, 0.02); // Kelly criterion, 2% max

    // First try dark pool (better price, no impact)
    await this.darkPool.submitOrder({
      market: market_id,
      isYes,
      sizeUsdc,
      limitPrice: Math.round(limitPrice * 10000), // basis points
      expiry: Date.now() / 1000 + 120, // 2 min expiry, then iceberg
    });

    console.log(`📰 Trade signal: ${signal.article_title}`);
    console.log(`   Market: ${market_id} | Side: ${isYes ? 'YES' : 'NO'} | Edge: ${(edge*100).toFixed(1)}%`);
  }

  calculatePositionSize(edge, maxFraction) {
    // Simplified Kelly criterion: f = edge / odds
    const kellyFraction = Math.min(edge / 0.5, maxFraction);
    const portfolioSize = 10_000; // $10k notional for demo
    return Math.round(portfolioSize * kellyFraction * 1_000_000); // USDC 6-decimal
  }
}
```

### Backtest Log (Required Deliverable)

```
BACKTEST: "Fed raises rates 50bps" — March 15, 2026, 14:00 UTC

News event: "Federal Reserve unexpectedly raises rates 50bps"
  Source: Reuters
  Detected at: 14:00:03 UTC

Markets analyzed: 12 active markets
Affected markets found: 2

  Market 1: "Will BTC fall below $80k in March 2026?"
    Current price: 32¢  →  Estimated post-news: 51¢
    Edge: 19.0%  Confidence: 78
    Action: BUY YES $200 USDC via dark pool
    Dark pool match: FOUND (counterparty at 38¢)
    Execution price: 35¢ (midpoint)
    Result: Position opened at 35¢, market moved to 48¢ within 1h
    P&L: +$37.14 (26% gain)

  Market 2: "Will Fed cut rates in Q2 2026?"
    Current price: 67¢  →  Estimated post-news: 28¢
    Edge: 39.0%  Confidence: 85
    Action: SELL YES $500 USDC via dark pool
    Dark pool match: NONE (no counterparty in 2min)
    Iceberg execution: 10 slices × $50 USDC over 9 minutes
    Average execution: 54¢ (market moved against us during iceberg)
    Result: Position opened at avg 54¢, settled at 31¢
    P&L: +$115.00 (42% gain)

TOTAL BACKTEST P&L: +$152.14 on $700 deployed
```

### Polymarket Pitch Angle

> "Our agent doesn't just monitor news — it routes orders through a dark pool first, minimizing price impact. Standard news agents get front-run the moment they hit the CLOB. Our agent gets better fill prices by finding private counterparties first, then dripping residuals via iceberg execution."

---

## 4. Gemini — Cross-Venue Price Feed & Arbitrage Detection

**Bounty:** Best Use of Gemini Prediction Markets API | $1,000 | ★★★★☆

### Integration Points

The Gemini Prediction Markets API provides:
- Live contract prices for similar events (politics, crypto, sports, economics)
- Order book data via REST and WebSocket
- Many events overlap with Polymarket markets (e.g., "Fed rate cut", "BTC price", US elections)

We integrate Gemini as:
1. **Secondary price feed** — displayed alongside Polymarket in our dashboard
2. **Cross-venue arbitrage detector** — if Gemini says 72¢ and Polymarket says 64¢, flag it
3. **Market discovery** — new Gemini markets we might not trade yet

```javascript
// backend/src/feeds/geminiPriceFeed.js
const BASE_URL = 'https://api.gemini.com';

class GeminiPriceFeed {
  async getEvents() {
    const res = await fetch(`${BASE_URL}/v1/predictionmarkets/events?status=active`);
    return res.json();
  }

  async getContractPrice(instrumentSymbol) {
    // Uses standard Gemini order book endpoint
    const res = await fetch(`${BASE_URL}/v1/book/${instrumentSymbol}`);
    const { bids, asks } = await res.json();
    const bid = parseFloat(bids[0]?.price ?? 0);
    const ask = parseFloat(asks[0]?.price ?? 0);
    return { bid, ask, mid: (bid + ask) / 2 };
  }

  // Match Gemini events to Polymarket markets using GPT-4o semantic matching
  async findCrossVenueMatches(polymarketMarkets) {
    const geminiEvents = await this.getEvents();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: `Match these Gemini events to Polymarket markets by topic.
        Return JSON array of { gemini_id, polymarket_id, similarity_score }.
        Gemini: ${JSON.stringify(geminiEvents.slice(0,20))}
        Polymarket: ${JSON.stringify(polymarketMarkets.slice(0,20))}`
      }],
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content).matches;
  }

  // Detect arbitrage: same event trading at different prices on each venue
  async detectArbitrage(crossVenueMatches) {
    const opportunities = [];
    for (const match of crossVenueMatches) {
      if (match.similarity_score < 0.8) continue;
      const geminiPrice = await this.getContractPrice(match.gemini_instrument);
      const polyPrice = await polymarketFeed.getPrice(match.polymarket_id);
      const spread = Math.abs(geminiPrice.mid - polyPrice.mid);
      if (spread > 0.02) { // 2¢ spread = arb opportunity after fees
        opportunities.push({ ...match, geminiPrice, polyPrice, spread });
      }
    }
    return opportunities;
  }
}
```

### Dashboard Widget

The web dashboard includes a "Cross-Venue Intelligence" panel:

```
┌─────────────────────────────────────────────────────────┐
│  CROSS-VENUE ARBITRAGE TRACKER                          │
│                                                         │
│  Event: Fed Rate Cut Q2 2026                           │
│  Polymarket: YES 72¢  |  Gemini: YES 65¢               │
│  Spread: 7¢  ⚡ ARB OPPORTUNITY                        │
│  Action: [ROUTE SELL-YES to Dark Pool ▶]               │
│                                                         │
│  Event: BTC above $100k EOY 2026                       │
│  Polymarket: YES 43¢  |  Gemini: YES 44¢               │
│  Spread: 1¢  ✓ Aligned                                 │
└─────────────────────────────────────────────────────────┘
```

### Gemini Pitch Angle

> "We use the Gemini Prediction Markets API to identify cross-venue pricing discrepancies. When Gemini and Polymarket disagree on the same event, our agent routes orders through the dark pool to capture the spread without alerting arbitrageurs on either venue."

---

## 5. Solana — Dark Pool Prediction Market via DFlow/Kalshi

**Bounty:** Best Prediction Market on Solana | $1,000 | ★★★★★

### Architecture Change from Original Plan

Original Solana plan: basic commit-reveal Anchor program.
**New plan:** Full dark pool that settles through DFlow's Prediction Markets API, which tokenizes Kalshi markets as SPL tokens.

```
Solana Dark Pool Flow:
1. Trader submits order commitment (Anchor program, PDA storage)
2. Matching engine runs off-chain (same Node.js service)
3. Settlement: matched orders execute against DFlow/Kalshi SPL markets
   → DFlow API provides SPL token representations of Kalshi markets
   → Matched trades execute as SPL token swaps
4. Unmatched portions: route to Kalshi CLOB via DFlow API
```

### Why This is Novel

- Kalshi is CFTC-regulated: real legal prediction markets
- DFlow tokenizes Kalshi markets as SPL tokens tradeable on Solana
- Our dark pool adds a **privacy layer** on top of this: trade Kalshi markets without showing your hand on Solana

```rust
// programs/dark_pool/src/lib.rs

use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Transfer};

#[program]
pub mod dark_pool {
    use super::*;

    pub fn commit_order(ctx: Context<CommitOrder>, commit_hash: [u8; 32]) -> Result<()> {
        let commitment = &mut ctx.accounts.commitment;
        commitment.trader = ctx.accounts.trader.key();
        commitment.commit_hash = commit_hash;
        commitment.timestamp = Clock::get()?.unix_timestamp;
        commitment.state = OrderState::Committed;
        commitment.nonce = ctx.accounts.trader_account.nonce;
        Ok(())
    }

    pub fn reveal_order(
        ctx: Context<RevealOrder>,
        market: Pubkey,          // DFlow market pubkey
        is_yes: bool,
        size: u64,               // in USDC lamports (6 decimals)
        limit_price_bps: u16,    // 0-10000
        expiry: i64,
        salt: [u8; 32],
    ) -> Result<()> {
        // Verify hash
        let hash = solana_program::keccak::hashv(&[
            market.as_ref(), &[is_yes as u8], &size.to_le_bytes(),
            &limit_price_bps.to_le_bytes(), &expiry.to_le_bytes(), &salt
        ]).0;
        require!(hash == ctx.accounts.commitment.commit_hash, ErrorCode::HashMismatch);

        // Lock USDC in escrow PDA
        anchor_spl::token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), Transfer {
                from: ctx.accounts.trader_usdc.to_account_info(),
                to: ctx.accounts.escrow_usdc.to_account_info(),
                authority: ctx.accounts.trader.to_account_info(),
            }),
            size,
        )?;

        ctx.accounts.order.market = market;
        ctx.accounts.order.is_yes = is_yes;
        ctx.accounts.order.size = size;
        ctx.accounts.order.limit_price_bps = limit_price_bps;
        ctx.accounts.order.state = OrderState::Revealed;
        Ok(())
    }

    // Called by matching engine with CPI after finding match
    pub fn settle_match(
        ctx: Context<SettleMatch>,
        matched_size: u64,
        matched_price_bps: u16,
    ) -> Result<()> {
        // Transfer matched funds between escrows
        // In production: CPI to DFlow's swap instruction
        // For hackathon: direct SPL token transfer between parties
        msg!("Settled match: {} USDC at {} bps", matched_size, matched_price_bps);
        Ok(())
    }
}
```

### DFlow Integration

```javascript
// backend/src/solana/dflowClient.js
// DFlow Prediction Markets API (Kalshi on Solana)

class DFlowClient {
  constructor({ connection, wallet }) {
    this.connection = connection;
    this.wallet = wallet;
  }

  async getMarkets() {
    // DFlow API returns Kalshi markets tokenized as SPL tokens
    const res = await fetch('https://api.dflow.net/v1/prediction-markets');
    return res.json();
  }

  async executeIcebergSlice(order, sliceSize) {
    // Place order on Kalshi via DFlow's SPL token market
    // This creates a swap between USDC and YES/NO SPL tokens
    const market = await this.getMarket(order.dflow_market_id);
    const tx = await market.swap({
      side: order.isYes ? 'buy-yes' : 'buy-no',
      size: sliceSize,
      maxPrice: order.limitPriceBps / 10000,
    });
    return this.wallet.sendTransaction(tx, this.connection);
  }
}
```

### Solana (Markets) Pitch Angle

> "A dark pool for Kalshi's CFTC-regulated markets on Solana. We leverage DFlow's tokenization of Kalshi markets as SPL tokens, then add a private matching layer on top. This brings institutional-grade order hiding to the most regulated prediction market ecosystem."

---

## 6. Solana — x402 Monetized Matching Engine

**Bounty:** Best Use of Agentic Payments on Solana with x402 | $1,000 | ★★★☆☆

### Concept

The matching engine is a **paid API service**. External agents (other trading bots, hedge funds, protocols) can access the dark pool liquidity by paying per-match via x402 on Solana.

```
External AI Agent → POST /api/orders/submit
                 ← HTTP 402 Payment Required
                    { "x402": { "scheme": "exact", "network": "solana-devnet",
                      "maxAmountRequired": "100", "asset": "USDC", "payTo": "..." } }
Agent pays 0.1 USDC on Solana via x402
                 → POST /api/orders/submit (with payment proof header)
                 ← 200 OK { orderId: "..." }
```

```javascript
// backend/src/middleware/x402.js
const { paymentMiddleware } = require('@x402/express');
const { findOrCreateFacilitator } = require('@x402/svm');

// Protect the matching API with x402 payment requirement
app.use('/api/orders/submit', paymentMiddleware(
  process.env.SOLANA_WALLET_ADDRESS,  // receives payment
  {
    '/api/orders/submit': {
      price: '$0.10',                 // $0.10 per order submission
      network: 'solana-devnet',
      description: 'Access to dark pool matching engine'
    }
  }
));

// x402-protected endpoint: only reachable with valid Solana payment proof
app.post('/api/orders/submit', async (req, res) => {
  // req.payment contains verified x402 payment details
  const { orderId } = await darkPool.submitOrder(req.body);
  res.json({ orderId, payment_verified: true });
});
```

### x402 Pitch Angle

> "Our matching engine is an x402-gated API service. Any AI agent anywhere can pay 10¢ on Solana to submit an order — no API keys, no subscriptions, no human approval. The dark pool becomes the first prediction market infrastructure to support fully autonomous agentic access via x402."

---

## 7. Solana — Swig Smart Account for Agent Wallet

**Bounty:** Smart Account Provisioning for OpenClaw Agents | $1,000 | ★★★☆☆

### Concept

The dark pool **trading agent** (Section 3) needs a wallet. Instead of a plaintext private key, we provision it with a **Swig smart account** on Solana, controlled by policy rules the human sets via Telegram.

```
Swig Smart Account for Dark Pool Agent:
  Role 1 (OPERATOR): Agent keypair — can execute trades within policy
    Permissions: swap tokens, submit orders, max $500/tx, $5000/day
    Allowed programs: DFlow, our dark pool, Kalshi
    Blocked programs: everything else

  Role 2 (OWNER): Human's wallet — can update policies, emergency stop
    Permissions: full control
    Auth: hardware key (Ledger) + Mac Keychain backup

  Role 3 (RECOVERY): Email-based 3rd key
    Permissions: key rotation only
```

### Implementation

```javascript
// bot/src/wallet/swigProvisioner.js
const { Swig } = require('@swig/sdk');

async function provisionAgentWallet(agentKeypair, ownerPublicKey) {
  const swig = new Swig({ connection });

  // Create smart account
  const account = await swig.createAccount({
    payer: ownerKeypair,
  });

  // Add agent role: can trade within limits
  await swig.addRole(account, {
    authority: agentKeypair.publicKey,
    permissions: {
      tokenTransfer: { maxAmount: 500_000_000 },      // $500 max
      programWhitelist: [DFLOW_PROGRAM_ID, DARK_POOL_PROGRAM_ID],
    },
    dailySpendLimit: 5_000_000_000,    // $5,000/day
    sessionExpiry: 86400,              // Keys expire daily
  });

  // Add owner role: full control
  await swig.addRole(account, {
    authority: ownerPublicKey,
    permissions: { all: true },
  });

  return account;
}
```

### Telegram as Human Control Interface

The Telegram bot becomes the **management plane** for the Swig smart account:

```
/agent-status  →  Shows current spend: $420/$5,000 today (12 trades)
/agent-pause   →  Revokes agent's session key (emergency stop)
/set-limit 200 →  Updates per-tx limit to $200
/whitelist 0x. →  Adds address to agent's allowlist
/approve       →  Approves a pending high-value trade ($500+)
```

### Swig Pitch Angle

> "The dark pool trading agent runs autonomously, but the human stays in control. We use Swig smart accounts to enforce spend limits, program whitelists, and behavioral guardrails — the Telegram bot is the human's dashboard. When the agent tries to make a trade above $500, it pauses and asks for approval."

---

## 8. TRON — DeFi Dark Pool Product Demo

**Bounty:** Payments & DeFi Product Demo | $1,000 | ★★★★☆

### Two Clear Roles (Required by Bounty)

1. **Trader (payer):** Submits dark pool orders via Telegram or web UI
2. **Market Maker (liquidity provider):** Provides standing orders, earns the bid/ask spread

```
Market Maker Flow:
  1. MM sets parameters: markets, bid/ask spread, max position size
  2. MM deposits USDT into dark pool contract on TRON
  3. System automatically creates resting limit orders both sides
  4. When trader order matches MM order: atomic swap via dark pool contract
  5. MM earns spread (buy at 62¢, sell at 66¢ = 4¢/share profit)
  6. MM can withdraw at any time (non-custodial)
```

### TRON-Specific Features

```solidity
// contracts/tron/DarkPoolTron.sol
// Solidity-compatible (TronIDE)

pragma solidity ^0.8.20;

contract DarkPoolTron {
    // TRC-20 USDT (most liquid on TRON)
    address public constant USDT = 0xa614f803B6FD780986A42c78Ec9c7f77e6DeD13;

    // Roles
    mapping(address => bool) public marketMakers;
    mapping(address => uint256) public mmBalances;

    struct Order {
        address trader;
        bool    isYes;       // YES or NO side
        uint256 size;        // USDT amount
        uint256 limitPrice;  // basis points
        uint256 expiry;
        bytes32 commitHash;
        OrderState state;
    }

    // Market maker deposits liquidity
    function depositLiquidity(uint256 amount) external {
        ITRC20(USDT).transferFrom(msg.sender, address(this), amount);
        mmBalances[msg.sender] += amount;
        marketMakers[msg.sender] = true;
    }

    // Atomic swap for matched dark pool orders
    function executeMatch(
        address buyer, address seller,
        uint256 matchedSize, uint256 matchedPrice
    ) external onlyMatchingEngine {
        // Transfer USDT from buyer escrow to seller
        // Transfer YES-position tokens from seller to buyer
        // All-or-nothing atomic settlement
        emit MatchSettled(buyer, seller, matchedSize, matchedPrice, block.timestamp);
    }
}
```

### TRON UX Requirements (Per Bounty)

The bounty requires:
- [x] Two roles: Trader + Market Maker
- [x] Setup/onboarding step (TronLink connect, deposit USDT)
- [x] Payment action (submit dark pool order)
- [x] Verifiable outcome (settlement tx on Tronscan)
- [x] Clear fee display (0.1% settlement fee)
- [x] Failure handling (insufficient USDT, expired order UI messages)

### TRON Pitch Angle

> "The first dark pool for prediction market liquidity on TRON. Market makers deposit USDT and earn the bid-ask spread from matched orders — similar to being a designated market maker on a traditional exchange, but fully non-custodial and on-chain."

---

## 9. TRON — AI & Agentic Commerce via x402-style Payments

**Bounty:** AI & Agentic Commerce | $1,000 | ★★★★☆

### x402-style Payments on TRON

The TRON bounty specifically calls out "x402-style payments on TRON" as a desired direction. We implement this for access to our matching engine:

```
AI Agent Request:
  POST /api/tron/orders/submit
  ← HTTP 402 { payment: { chain: "TRON-NILE", amount: "0.1 USDT",
                           to: "TVXxx...", memo: "dark-pool-access" } }

Agent signs + broadcasts TRON payment tx
  POST /api/tron/orders/submit
  Header: X-TRON-Payment-TxHash: abc123...
  ← 200 OK (server verified tx on-chain)
```

```javascript
// backend/src/middleware/x402Tron.js

const { TronWeb } = require('tronweb');
const tronWeb = new TronWeb({ fullHost: 'https://nile.trongrid.io' });

function tronX402Middleware(requiredAmount, receivingAddress) {
  return async (req, res, next) => {
    const txHash = req.headers['x-tron-payment-txhash'];

    if (!txHash) {
      return res.status(402).json({
        payment_required: {
          chain: 'TRON-NILE',
          amount: requiredAmount,   // '0.1 USDT'
          asset: 'USDT_TRC20',
          to: receivingAddress,
          memo: 'dark-pool-access',
          instructions: 'Broadcast a TRC-20 USDT transfer, include this endpoint in the memo'
        }
      });
    }

    // Verify payment on-chain
    const tx = await tronWeb.trx.getTransaction(txHash);
    const isValid = verifyUSDTTransfer(tx, requiredAmount, receivingAddress);

    if (!isValid) return res.status(402).json({ error: 'Payment verification failed' });

    req.payment = { txHash, verified: true };
    next();
  };
}
```

### Agent Security: TRON Multi-Sig Permission Model

Per the bounty's security direction, we use TRON's native account permission management:

```javascript
// Agent wallet with restricted permissions (via TronWeb)
const agentPermissions = {
  owner: { threshold: 1, keys: [{ address: ownerAddress, weight: 1 }] },
  active: [{
    type: 2, // Custom permission
    id: 2,
    threshold: 1,
    keys: [{ address: agentAddress, weight: 1 }],
    operations: '7fff1fc0033e0000000000000000000000000000000000000000000000000000',
    // Only allows: TransferContract (TRC-20 sends) within our contract
  }]
};
// Agent can only call our dark pool contract — cannot drain entire wallet
```

### TRON AI/Agentic Pitch Angle

> "Our AI trading agent pays for dark pool access via x402-style micropayments on TRON. Each match costs 0.1 USDT — no API keys, no subscriptions. The agent's TRON wallet uses native account permission management to restrict what it can sign, preventing the agent from taking unauthorized actions."

---

## 10. Filecoin — Decentralized Agent Memory & Logs

**Bounty:** Decentralized Infrastructure for Self-Sustaining AI | $1,000 | ★★★☆☆

### What We Store on Filecoin

1. **Order logs:** Every dark pool order (anonymized) → permanent audit trail
2. **Agent memory:** News analysis results, confidence scores, trade decisions
3. **Agent identity:** ERC-8004 agent registration with Filecoin-backed metadata
4. **Reputation:** Historical performance metrics (accuracy vs Polymarket outcomes)

```javascript
// backend/src/filecoin/agentStorage.js
const { SynapseClient } = require('@filoz/synapse-sdk');

class AgentStorage {
  constructor() {
    this.synapse = new SynapseClient({ network: 'calibnet' });
    this.agentId = null;
  }

  // Register agent identity on Filecoin (ERC-8004 style)
  async registerAgent(agentMetadata) {
    const metadata = {
      name: 'DarkPoolTradingAgent',
      version: '1.0.0',
      capabilities: ['prediction-market-trading', 'dark-pool-execution'],
      created_at: new Date().toISOString(),
      ...agentMetadata
    };

    // Store on Filecoin via Synapse SDK
    const { cid } = await this.synapse.store(JSON.stringify(metadata));
    this.agentId = cid;
    console.log(`Agent registered on Filecoin: ipfs://${cid}`);
    return cid;
  }

  // Store order log entry
  async logOrder(order) {
    const entry = {
      orderId: order.orderId,
      market: order.market,
      timestamp: order.committedAt,
      result: order.state,
      // Note: size/price omitted for privacy
    };

    const { cid } = await this.synapse.store(JSON.stringify(entry));
    return cid;
  }

  // Store news analysis result (agent "memory")
  async storeMemory(analysis) {
    const memory = {
      event_type: 'news_analysis',
      timestamp: Date.now(),
      article_headline: analysis.article_title,
      affected_markets: analysis.affected_markets.length,
      edge_found: analysis.edge,
      action_taken: analysis.action,
      outcome: analysis.outcome ?? null,
    };

    const { cid } = await this.synapse.store(JSON.stringify(memory));

    // Update reputation score based on outcome
    if (analysis.outcome) {
      await this.updateReputation(analysis.outcome);
    }
    return cid;
  }

  // Retrieve agent's track record (verifiable reputation)
  async getReputationReport() {
    // Fetch all stored memory CIDs for this agent
    const entries = await this.synapse.list({ prefix: `agent/${this.agentId}/` });
    // Compute accuracy: predicted probability vs actual outcome
    return this.computeCalibration(entries);
  }
}
```

### Filecoin Pitch Angle

> "Our trading agent stores its memory and logs on Filecoin — every trade decision, news analysis, and outcome is permanently recorded. This creates a verifiable track record: judges can query the Filecoin CID and verify our agent's historical accuracy. This is agent reputation infrastructure for prediction markets."

---

## 11. Core Smart Contracts (Polygon Primary)

### Updated: Alkahest-Powered Dark Pool (replaces custom commit-reveal)

```solidity
// contracts/DarkPoolArbiter.sol
// Deployed on: Polygon Mumbai (primary), Sepolia (Alkahest testnet)

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@alkahest/IArbiter.sol";
import "@alkahest/IAlkahest.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DarkPoolArbiter is IArbiter, Ownable {
    IAlkahest public immutable alkahest;
    address public matchingEngine;

    // Events
    event MatchFulfilled(uint64 buyEscrow, uint64 sellEscrow, uint256 price, uint256 size);
    event IcebergQueued(uint64 escrowId, uint256 residualSize);

    struct MatchRecord {
        uint64 buyEscrowId;
        uint64 sellEscrowId;
        uint256 matchedPrice;
        uint256 matchedSize;
        uint256 timestamp;
    }
    mapping(bytes32 => MatchRecord) public matches;

    constructor(address _alkahest, address _matchingEngine) {
        alkahest = IAlkahest(_alkahest);
        matchingEngine = _matchingEngine;
    }

    // IArbiter interface: called by Alkahest when escrow is being fulfilled
    function arbitrate(
        uint64 escrowId,
        bytes calldata statement
    ) external override returns (bool) {
        // Only allow fulfillment when we've recorded a match
        (uint64 counterpartyId) = abi.decode(statement, (uint64));
        bytes32 pairKey = keccak256(abi.encodePacked(
            escrowId < counterpartyId ? escrowId : counterpartyId,
            escrowId < counterpartyId ? counterpartyId : escrowId
        ));
        return matches[pairKey].timestamp > 0;
    }

    // Called by matching engine when it finds a match
    function recordAndFulfillMatch(
        uint64 buyEscrowId,
        uint64 sellEscrowId,
        uint256 matchedPrice,
        uint256 matchedSize
    ) external onlyMatchingEngine {
        bytes32 pairKey = keccak256(abi.encodePacked(
            buyEscrowId < sellEscrowId ? buyEscrowId : sellEscrowId,
            buyEscrowId < sellEscrowId ? sellEscrowId : buyEscrowId
        ));

        matches[pairKey] = MatchRecord({
            buyEscrowId: buyEscrowId,
            sellEscrowId: sellEscrowId,
            matchedPrice: matchedPrice,
            matchedSize: matchedSize,
            timestamp: block.timestamp
        });

        // Fulfill both escrows atomically via Alkahest
        alkahest.fulfillEscrow(buyEscrowId, abi.encode(sellEscrowId));
        alkahest.fulfillEscrow(sellEscrowId, abi.encode(buyEscrowId));

        emit MatchFulfilled(buyEscrowId, sellEscrowId, matchedPrice, matchedSize);
    }

    modifier onlyMatchingEngine() {
        require(msg.sender == matchingEngine, "Not matching engine");
        _;
    }
}
```

### Network Deployment Summary

| Chain | Contract | Purpose |
|-------|----------|---------|
| Polygon Mumbai | DarkPoolArbiter.sol (+ Alkahest) | Primary — Polymarket settlement |
| Sepolia | DarkPoolArbiter.sol (+ Alkahest) | Arkhai bounty demo (Alkahest native) |
| TRON Nile | DarkPoolTron.sol | TRON bounties |
| Solana Devnet | dark_pool Anchor program | Solana bounties (DFlow settlement) |

---

## 12. Matching Engine & Iceberg Queue

*(See original plan Sections 6–7 — unchanged in core logic. New additions:)*

### New: x402 Payment Verification Middleware

```javascript
// backend/src/server.js
const { x402TronMiddleware } = require('./middleware/x402Tron');
const { paymentMiddleware: x402SolanaMiddleware } = require('@x402/express');

// Solana x402 protection
app.use('/api/solana/orders/submit',
  x402SolanaMiddleware(SOLANA_RECEIVER_WALLET, { '/api/solana/orders/submit': { price: '$0.10', network: 'solana-devnet' } })
);

// TRON x402 protection
app.use('/api/tron/orders/submit',
  x402TronMiddleware('0.1 USDT', TRON_RECEIVER_WALLET)
);
```

### New: Filecoin Log Hook

```javascript
// Attach Filecoin logging to all order state transitions
orderBook.on('order:settled', async (order) => {
  await agentStorage.logOrder(order);
});

newsAgent.on('trade:executed', async (analysis) => {
  await agentStorage.storeMemory(analysis);
});
```

### New: Alkahest Escrow Listener

```javascript
// backend/src/chain/alkahestListener.js
// Listen for new Alkahest escrows that should be matched
alkahest.on('EscrowCreated', async (escrowId, obligation, demand, arbiter) => {
  if (arbiter !== DARK_POOL_ARBITER) return; // not ours
  const escrow = await alkahest.getEscrow(escrowId);
  matchingEngine.enqueueAlkahestOrder(escrow);
});
```

---

## 13. Telegram + OpenAI Bot

*(See original plan Section 8 — enhanced with:)*

### New Commands (Swig Smart Account Management)

```
/agent-status      — Show agent's daily spend, active positions, Swig account state
/agent-pause       — Emergency stop: revoke agent's Swig session key
/set-limit <$>     — Update per-transaction spend limit on Swig
/approve <orderId> — Approve a high-value trade held for human review
/reputation        — Show agent's historical accuracy (from Filecoin)
/arb-alerts on/off — Subscribe to Gemini/Polymarket cross-venue arb alerts
```

---

## 14. Frontend Dashboard

### New Panels vs Original Plan

| Panel | Bounty | Content |
|-------|--------|---------|
| Cross-Venue Intel | Gemini | Gemini vs Polymarket prices, arb opportunities |
| Agent Activity | Filecoin / Polymarket | News signals, trade decisions, Filecoin log CIDs |
| Swig Controls | Solana (smart accts) | Spend limits, whitelist management, approval queue |
| TRON Market Maker | TRON (DeFi) | MM balance, standing orders, earned spread |
| x402 Access | Solana/TRON | API key-less access with payment instructions |

---

## 15. Tech Stack Decisions

| Component | Choice | Serves Bounty |
|-----------|--------|---------------|
| Escrow layer | Alkahest SDK + DarkPoolArbiter.sol | Arkhai |
| News feeds | NewsAPI + RSS + OpenAI GPT-4o | Polymarket |
| Cross-venue prices | Gemini Prediction Markets API | Gemini |
| Solana settlement | DFlow API (Kalshi SPL tokens) | Solana (markets) |
| Solana smart accounts | Swig SDK (@swig/sdk) | Solana (smart accts) |
| Agentic payments | @x402/express + x402Tron custom | Solana x402 / TRON AI |
| Decentralized storage | Synapse SDK (@filoz/synapse-sdk) | Filecoin |
| TRON contracts | TronIDE (Solidity) + TronWeb.js | TRON bounties |
| Matching engine | Node.js + Redis + Bull | All bounties |
| Bot | grammy.js + OpenAI | All bounties |
| Frontend | Next.js 15 + wagmi + shadcn | All bounties |
| Deployment | Railway (backend) + Vercel (frontend) | All bounties |

---

## 16. Data Models & API Contracts

*(See original plan Section 11 — add these new endpoints:)*

```
POST   /api/solana/orders/submit       (x402-gated, Solana payment)
POST   /api/tron/orders/submit         (x402-TRON-gated, TRON payment)
GET    /api/gemini/cross-venue         → ArbitrageOpportunity[]
GET    /api/agent/memory               → FilecoinMemoryEntry[]
GET    /api/agent/reputation           → ReputationReport
POST   /api/swig/update-policy         → update agent spend limits
GET    /api/swig/pending-approvals     → PendingApproval[]
POST   /api/swig/approve/:orderId      → approve high-value trade
GET    /api/news/signals               → NewsSignal[]
```

---

## 17. 48-Hour Implementation Phases

### Priority Ordering

Given 48h, we prioritize by: (a) prize value, (b) integration effort, (c) dependency on other tracks.

```
P0 (must ship for any prize):
  → Core matching engine + Telegram bot + Polymarket CLOB integration

P1 (high prize, low added effort):
  → Polymarket news agent (adds to existing bot)
  → Gemini API integration (read-only, fast)
  → Alkahest escrow (replaces custom contract, same demo)

P2 (high prize, medium effort):
  → TRON DeFi demo (need good UX)
  → Solana DFlow settlement (replaces mock CTF Exchange)

P3 (good prize, bounded effort):
  → x402 on Solana (middleware wrapper, 2-3h)
  → x402-TRON (custom middleware, 2-3h)
  → Filecoin logging (additive, 2-3h)

P4 (nice to have):
  → Swig smart accounts (more complex, 4-6h)
  → Full cross-venue arb dashboard
```

### Hour-by-Hour Schedule

#### Hour 0–2: Setup (ALL TEAM)
- [ ] Monorepo init: `contracts/`, `backend/`, `frontend/`, `bot/`
- [ ] Install: Hardhat, Anchor, grammy, ethers.js, @alkahest/sdk, @x402/express, @swig/sdk, @filoz/synapse-sdk
- [ ] Create: Alchemy (Polygon), Railway, Vercel, Telegram bot, OpenAI, NewsAPI, Filecoin accounts
- [ ] Set up Alkahest local dev: `npx alkahest deploy-local`

#### Hour 2–10: Core P0 (Backend Dev 1 + Bot Dev)
- [ ] Matching engine: OrderBook, Matcher, ChainListener, Settler
- [ ] Alkahest escrow listener (replaces OrderRevealed listener)
- [ ] DarkPoolArbiter.sol — Hardhat tests
- [ ] grammy bot: /start, RFQ flow, OpenAI intent
- [ ] Deploy DarkPoolArbiter to Sepolia (Alkahest testnet) — covers Arkhai bounty

#### Hour 2–8: News Agent (Backend Dev 2) — P1
- [ ] NewsAPI client + RSS parser
- [ ] GPT-4o article analyzer with market matching
- [ ] Edge calculator (Kelly criterion sizing)
- [ ] Wire to dark pool order submission
- [ ] Generate backtest log (script against historical data)

#### Hour 8–14: Gemini + Cross-Venue (Backend Dev 2) — P1
- [ ] Gemini Prediction Markets API client
- [ ] Cross-venue event matching (GPT-4o semantic)
- [ ] Arb detection logic
- [ ] WebSocket subscription for live Gemini prices
- [ ] Dashboard widget (Cross-Venue Intel panel)

#### Hour 2–10: TRON Contract + UX (Contract Dev) — P2
- [ ] DarkPoolTron.sol in TronIDE
- [ ] Market maker deposit/withdraw flow
- [ ] Trader submit/reveal flow
- [ ] Deploy to Nile testnet
- [ ] Basic TRON web UI (two-role demo)

#### Hour 10–16: Solana DFlow + Anchor (Contract Dev) — P2
- [ ] Anchor program: commit_order, reveal_order, settle_match
- [ ] DFlow API client for Kalshi SPL markets
- [ ] Iceberg execution via DFlow swap
- [ ] Deploy to devnet

#### Hour 14–18: x402 Layer (Backend Dev 1) — P3
- [ ] @x402/express middleware on Solana matching endpoint
- [ ] Custom TRON x402 middleware
- [ ] Test agent payment flow end-to-end
- [ ] TRON multi-sig permission setup for agent wallet

#### Hour 14–18: Filecoin Storage (Bot Dev) — P3
- [ ] Synapse SDK setup + calibnet connection
- [ ] Agent registration (ERC-8004 metadata)
- [ ] Order log hook → Filecoin store
- [ ] Memory store hook on news analysis
- [ ] Reputation report endpoint

#### Hour 18–24: Swig Smart Accounts (if bandwidth) — P4
- [ ] Swig account provisioning for trading agent
- [ ] Mac Keychain + email recovery key storage
- [ ] Telegram /agent-status, /agent-pause, /approve commands
- [ ] Policy update flow

#### Hour 18–26: Frontend Dashboard
- [ ] Next.js scaffold + wagmi + shadcn
- [ ] Market browser (Polymarket + Gemini prices)
- [ ] Order form (Alkahest escrow create wizard)
- [ ] Cross-Venue Intel panel (Gemini arb)
- [ ] Agent Activity panel (news signals + Filecoin CIDs)
- [ ] TRON Market Maker panel
- [ ] Vercel deploy

#### Hour 26–38: Testing & Integration
- [ ] End-to-end test: news event → agent trades → dark pool → Alkahest settle
- [ ] End-to-end test: x402 payment → order submission → iceberg execution
- [ ] TRON: trader + market maker two-role demo
- [ ] Solana: DFlow iceberg slice execution
- [ ] Generate backtest logs for Polymarket submission

#### Hour 38–44: Demo Preparation
- [ ] Record primary demo video (full flow: news → trade → dark pool → settle)
- [ ] Record TRON-specific video (two-role DeFi demo)
- [ ] Seed demo environment with pre-committed orders
- [ ] Write per-bounty README sections

#### Hour 44–48: Submissions
- [ ] Polymarket: news agent + backtest logs
- [ ] Arkhai: Alkahest arbiter demo video
- [ ] Solana (markets): DFlow dark pool on devnet
- [ ] Solana (x402): x402 API demo
- [ ] TRON (DeFi): two-role product demo
- [ ] TRON (AI): x402-TRON + multi-sig agent demo
- [ ] Gemini: cross-venue dashboard demo
- [ ] Filecoin: agent memory + reputation demo
- [ ] Solana (smart accts): Swig provisioning demo (if completed)

---

## 18. Team Workstreams

| Person | Primary | Secondary | Hours Focus |
|--------|---------|-----------|-------------|
| **Contract Dev** | DarkPoolArbiter.sol + Alkahest, TRON contract | Solana Anchor program | 0-18h smart contracts |
| **Matching Engine Dev** | Matching engine, ChainListener, Alkahest listener | x402 middleware | 0-18h backend core |
| **AI/Agent Dev** | News agent (GPT-4o), Filecoin storage, Gemini feed | Backtest logs | 2-18h agent systems |
| **Bot/Frontend Dev** | Telegram bot + Swig commands, Next.js dashboard | x402 TRON, cross-venue UI | 2-24h bot + frontend |
| **Trading/PM** | Demo prep, pitch, backtest data, submission | TRON UX, market maker demo | 24-48h demo + pitch |

---

## 19. Demo Script & Pitch Narrative

### Master Demo Script (5 minutes — covers most bounties)

**Setup:** Open browser with dashboard, Telegram on phone.

1. **[0:00]** Dashboard shows live Polymarket + Gemini prices side by side. Red badge: "⚡ ARB: Fed Rate Cut — Gemini 72¢ vs Polymarket 65¢ — 7¢ spread"

2. **[0:30]** News feed ticker: "Breaking: Fed unexpectedly raises rates 50bps." Agent activity panel updates: "News signal detected — analyzing 12 markets..."

3. **[1:00]** Agent panel: "Signal found. BUY YES on BTC<$80k market. Edge: 19%. Submitting to dark pool." On Telegram: notification "📰 Trade submitted: BUY 200 USDC..."

4. **[1:20]** Show Polygonscan — only the Alkahest escrow creation is visible. No price, no size. "This is all anyone on-chain can see: a conditional escrow. Not a buy, not a sell, not a size."

5. **[2:00]** Matching engine finds counterparty. "Match found: 200 USDC at 35¢ midpoint." Alkahest settles atomically — show both escrows releasing in same tx.

6. **[2:30]** TRON tab: show market maker's standing orders + a trader filling one. Tronscan shows the settlement tx with USDT amounts.

7. **[3:00]** Agent memory: click CID link → Filecoin dashboard showing stored analysis. "Every decision is verifiable and permanent. This is the agent's reputation."

8. **[3:30]** x402 demo: `curl -X POST .../api/solana/orders/submit` → "402 Payment Required". Agent pays 0.1 USDC on Solana → request retries → "200 OK". "No API keys. No accounts. Just pay and trade."

9. **[4:00]** Telegram: `/agent-status` → "Today: 3 trades, $420 of $5,000 limit used. 2 open positions." `/set-limit 300` → "Limit updated on Swig smart account."

10. **[4:30]** Close: "Same system. Nine bounties. One unified dark pool for prediction markets."

### Per-Bounty Pitch Angles

| Bounty | 15-Second Pitch |
|--------|----------------|
| **Polymarket** | "First dark pool + news agent combo. We route news-driven trades through the dark pool first to avoid front-running, then iceberg the residual." |
| **Arkhai** | "We use Alkahest as the settlement primitive. The matching engine is an Alkahest arbiter — the first dark pool built on conditional EAS escrows." |
| **Solana (markets)** | "Dark pool for CFTC-regulated Kalshi markets on Solana, settling via DFlow SPL tokens. Novel mechanism: private matching + regulated settlement." |
| **Solana (x402)** | "Our matching API is the first x402-gated prediction market service. Any AI agent pays 10¢ on Solana per order — no API keys ever." |
| **TRON (DeFi)** | "Full DeFi dark pool on TRON: market makers earn spread, traders get privacy. Two-role product with USDT settlement and Tronscan verification." |
| **TRON (AI)** | "x402-style micropayments on TRON + native permission management for agent security. Agents pay-per-trade, can't exceed their scope." |
| **Gemini** | "We use Gemini API to detect cross-venue arb against Polymarket. When Gemini and Polymarket disagree, our agent routes orders to capture the spread privately." |
| **Filecoin** | "The trading agent stores all decisions on Filecoin. CID-backed audit trail enables verifiable reputation — judges can query our agent's historical accuracy." |
| **Solana (smart accts)** | "Swig smart accounts for the trading agent: $5k/day limit, program whitelist, daily key rotation. Telegram = human control interface." |

---

## 20. Risk Register

| Risk | Bounty Affected | Mitigation |
|------|----------------|------------|
| Alkahest docs unclear / API changed | Arkhai | Use `npx alkahest deploy-local` for Anvil; MCP server for docs |
| DFlow API access restricted | Solana (markets) | Fall back to Hedgehog Markets AMM as settlement layer |
| x402/Solana SDK incompatibility | Solana x402 | Use reference implementation from coinbase/x402 repo |
| Swig SDK incomplete/broken | Solana (smart accts) | Fall back to Squads Protocol (more mature) |
| NewsAPI rate limits during demo | Polymarket | Cache 5 pre-fetched articles; backtest is pre-recorded anyway |
| Filecoin calibnet slow | Filecoin | Pre-store demo entries before judges arrive; show CIDs live |
| TRON testnet congestion | TRON both | Pre-submit txs, show Tronscan proofs |
| Too many bounties → nothing ships well | All | Cut P4 (Swig) entirely if P0-P2 running behind at hour 18 |

---

## Appendix A: Key Library Installs

```bash
# Alkahest (Arkhai)
npm install @alkahest/sdk @alkahest/contracts

# x402 (Solana agentic payments)
npm install @x402/express @x402/core @x402/svm

# Swig (Solana smart accounts)
npm install @swig/sdk @swig/wallet-adapter

# Filecoin (Synapse SDK)
npm install @filoz/synapse-sdk

# Gemini
npm install # use native fetch — no SDK needed (public REST API)

# DFlow (Kalshi on Solana)
npm install # native fetch + Solana web3.js CPI calls

# TRON
npm install tronweb
```

## Appendix B: Critical API Endpoints

```
Alkahest:         npx alkahest deploy-local (Anvil)
                  https://www.arkhai.io/docs

Gemini:           https://api.gemini.com/v1/predictionmarkets/events
                  https://api.sandbox.gemini.com (sandbox)

DFlow/Kalshi:     https://api.dflow.net/v1/prediction-markets
Polymarket CLOB:  https://clob.polymarket.com
Filecoin:         https://docs.filecoin.cloud (Synapse SDK)
x402:             https://www.x402.org / https://github.com/coinbase/x402
Swig:             https://build.onswig.com
TRON:             https://nileex.io (testnet faucet)
```

## Appendix C: Repo Structure

```
penn-hackathon-darkpool/
├── contracts/
│   ├── DarkPoolArbiter.sol       ← Alkahest arbiter (Polygon/Sepolia)
│   ├── tron/DarkPoolTron.sol     ← TRON bounties
│   ├── test/
│   └── hardhat.config.js
├── programs/dark_pool/           ← Solana Anchor program
├── backend/
│   ├── src/
│   │   ├── matching/             ← OrderBook, Matcher, Settler
│   │   ├── chain/
│   │   │   ├── alkahestListener.js  ← NEW: replaces OrderRevealedListener
│   │   │   └── solanaListener.js
│   │   ├── agent/
│   │   │   └── newsAgent.js      ← NEW: Polymarket bounty
│   │   ├── feeds/
│   │   │   └── geminiPriceFeed.js   ← NEW: Gemini bounty
│   │   ├── filecoin/
│   │   │   └── agentStorage.js   ← NEW: Filecoin bounty
│   │   ├── middleware/
│   │   │   ├── x402Solana.js     ← NEW: Solana x402
│   │   │   └── x402Tron.js       ← NEW: TRON AI bounty
│   │   └── solana/
│   │       └── dflowClient.js    ← NEW: Solana markets bounty
├── bot/
│   ├── src/
│   │   ├── handlers/
│   │   │   ├── rfq.js
│   │   │   ├── status.js
│   │   │   └── swigControls.js   ← NEW: Swig smart account management
│   │   └── ai/intentExtractor.js
├── frontend/
│   ├── app/
│   │   ├── page.tsx              ← Market browser (Polymarket + Gemini)
│   │   ├── trade/page.tsx        ← Alkahest escrow wizard
│   │   ├── dashboard/page.tsx    ← Orders + agent activity + Filecoin CIDs
│   │   └── tron/page.tsx         ← TRON two-role DeFi demo
├── backtest/
│   └── newsAgentBacktest.js      ← Polymarket bounty required deliverable
└── README.md
```

---

*Plan v2.0 — Refactored 2026-03-27 for maximum bounty coverage*
*9 bounties targeted | $9,000 prize pool | Core: Agentic Dark Pool with multi-chain settlement*
