# Dark Pool for Prediction Markets — Implementation Plan

**Hackathon:** University of Pennsylvania Blockchain Hackathon '26
**Timeline:** 48-hour sprint
**Tracks targeted:** Prediction Markets · Tron · Solana · AI/Bots
**Privacy mechanism:** Commit-Reveal Scheme
**Primary platform:** Polymarket (Polygon/ETH)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem & Solution Architecture](#2-problem--solution-architecture)
3. [System Architecture Overview](#3-system-architecture-overview)
4. [Smart Contract Design](#4-smart-contract-design)
   - 4.1 [Polygon — Primary Dark Pool Contract](#41-polygon--primary-dark-pool-contract)
   - 4.2 [Tron Port](#42-tron-port)
   - 4.3 [Solana Port](#43-solana-port)
5. [Commit-Reveal Privacy Scheme](#5-commit-reveal-privacy-scheme)
6. [Off-Chain Matching Engine](#6-off-chain-matching-engine)
7. [Iceberg Order Execution](#7-iceberg-order-execution)
8. [Telegram + OpenAI RFQ Bot](#8-telegram--openai-rfq-bot)
9. [Frontend Dashboard](#9-frontend-dashboard)
10. [Tech Stack Decisions](#10-tech-stack-decisions)
11. [Data Models & API Contracts](#11-data-models--api-contracts)
12. [48-Hour Implementation Phases](#12-48-hour-implementation-phases)
13. [Team Workstreams & Assignments](#13-team-workstreams--assignments)
14. [Hackathon Track Strategy](#14-hackathon-track-strategy)
15. [Testing & Demo Strategy](#15-testing--demo-strategy)
16. [Risk Register & Mitigations](#16-risk-register--mitigations)
17. [Post-Hackathon Roadmap](#17-post-hackathon-roadmap)

---

## 1. Executive Summary

Large traders on Polymarket face a critical problem: **on-chain transparency exposes their positions**. A whale buying 10,000 USDC of "Yes" on a political market instantly signals insider activity, causing price impact before the order is fully filled and enabling front-running by bots.

This project builds a **dark pool layer on top of Polymarket** — a private matching venue where:
1. Orders are committed on-chain as hashed blobs (no size/direction visible)
2. An off-chain matching engine pairs buyers and sellers privately
3. Matched orders settle atomically through Polymarket's CTF Exchange
4. Unmatched residuals are broken into iceberg slices and dripped to the open market

The user interface is a **Telegram bot with AI-powered RFQ** (Request for Quote) — traders DM the bot, describe what they want in natural language, and the system handles routing, matching, and execution.

**Hackathon multi-track strategy:** Primary submission to Prediction Markets track; secondary submissions via Tron smart contract port and Solana matching engine port; AI track eligibility via OpenAI-powered bot.

---

## 2. Problem & Solution Architecture

### 2.1 The Information Leakage Problem

```
Traditional Polymarket flow:
Trader → Polymarket CLOB → On-chain order → VISIBLE PRICE IMPACT
                                             ↓
                              Front-runners see 50% price jump → copy trade
```

### 2.2 Dark Pool Solution Flow

```
Dark Pool flow:
Trader → Telegram Bot → Commit Hash → Dark Pool Contract (on-chain, opaque)
                             ↓
                    Off-chain Matching Engine
                             ↓
              ┌──────────────────────────────┐
              │  Match Found?                │
              │  YES → Atomic settlement     │ → Polymarket CTF Exchange
              │  NO  → Iceberg slices        │ → Polymarket CLOB (small batches)
              └──────────────────────────────┘
```

### 2.3 Why Commit-Reveal (Not ZK)

| Approach | Privacy | Complexity | 48h feasibility |
|----------|---------|------------|-----------------|
| Commit-Reveal | Medium | Low | ✅ Yes |
| zkSNARKs | High | Very High | ❌ No |
| Off-chain only | Low | Very Low | ✅ Yes |
| TEE (SGX) | High | High | ❌ No |

Commit-reveal is the pragmatic choice: battle-tested, cheap to implement, and sufficient to prevent front-running since the hash reveals nothing until the reveal phase.

---

## 3. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER INTERFACES                            │
│  ┌─────────────────────┐    ┌──────────────────────────────────┐   │
│  │   Telegram Bot      │    │   Web Dashboard (optional)       │   │
│  │   (OpenAI NLP)      │    │   (React / Next.js)              │   │
│  └─────────┬───────────┘    └─────────────────┬────────────────┘   │
└────────────┼────────────────────────────────── ┼───────────────────┘
             │                                   │
             ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND SERVICES                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    API Server (Express / FastAPI)            │  │
│  │   POST /order/commit    POST /order/reveal    GET /matches   │  │
│  └──────────────────────────────┬───────────────────────────────┘  │
│                                  │                                  │
│  ┌────────────────────────────── ▼──────────────────────────────┐  │
│  │                   Matching Engine (Node.js)                  │  │
│  │   - Order book (in-memory + Redis)                           │  │
│  │   - Matching algorithm (price-time priority)                 │  │
│  │   - Iceberg slicer                                           │  │
│  └──────────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────────┼───────────────────────────────────┘
                                  │
             ┌────────────────────┼────────────────────┐
             ▼                    ▼                     ▼
┌────────────────────┐ ┌─────────────────────┐ ┌──────────────────┐
│  POLYGON (Primary) │ │  TRON (Secondary)   │ │  SOLANA (Tertiary│
│  DarkPool.sol      │ │  DarkPoolTron.sol   │ │  dark_pool.rs    │
│  Commit-reveal     │ │  (TRC-20 port)      │ │  (Anchor prog.)  │
│  + Settlement      │ │                     │ │                  │
└────────┬───────────┘ └─────────────────────┘ └──────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│     POLYMARKET INTEGRATION      │
│   CTF Exchange Contract         │
│   CLOB API (order placement)    │
│   Price feed (market data)      │
└─────────────────────────────────┘
```

---

## 4. Smart Contract Design

### 4.1 Polygon — Primary Dark Pool Contract

**File:** `contracts/DarkPool.sol`

#### State Variables

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DarkPool {
    // Commitment storage: trader => nonce => commitment hash
    mapping(address => mapping(uint256 => bytes32)) public commitments;

    // Order state machine
    enum OrderState { COMMITTED, REVEALED, MATCHED, SETTLED, CANCELLED }
    mapping(bytes32 => OrderState) public orderStates;

    // Revealed order data (only after reveal phase)
    struct RevealedOrder {
        address trader;
        address market;          // Polymarket market address
        bool    isYes;           // Yes or No position
        uint256 size;            // USDC amount (6 decimals)
        uint256 limitPrice;      // Min/max price in basis points (0-10000)
        uint256 expiry;          // Unix timestamp
        bytes32 salt;            // Random salt used in commitment
    }
    mapping(bytes32 => RevealedOrder) public revealedOrders;

    // Matched pairs awaiting settlement
    struct MatchedPair {
        bytes32 buyOrderId;
        bytes32 sellOrderId;
        uint256 matchedSize;
        uint256 matchedPrice;
        bool    settled;
    }
    mapping(bytes32 => MatchedPair) public matchedPairs;

    // Admin (matching engine hot wallet)
    address public matchingEngine;
    address public owner;

    // USDC on Polygon
    address public constant USDC = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;

    // Polymarket CTF Exchange
    address public constant CTF_EXCHANGE = 0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E;

    // Timing parameters
    uint256 public constant COMMIT_WINDOW = 10 minutes;
    uint256 public constant REVEAL_WINDOW = 5 minutes;
    uint256 public constant MATCH_WINDOW = 3 minutes;

    // Events
    event OrderCommitted(bytes32 indexed commitHash, address indexed trader, uint256 timestamp);
    event OrderRevealed(bytes32 indexed commitHash, address indexed market, bool isYes, uint256 size);
    event OrderMatched(bytes32 indexed pairId, bytes32 buyOrder, bytes32 sellOrder, uint256 size, uint256 price);
    event OrderSettled(bytes32 indexed pairId);
    event IcebergSliceQueued(bytes32 indexed orderId, uint256 sliceSize);
}
```

#### Core Functions

```solidity
// PHASE 1: COMMIT
// Trader submits hash(market, isYes, size, limitPrice, expiry, salt)
// On-chain: only the hash is stored. NO order details visible.
function commitOrder(bytes32 commitHash) external returns (bytes32 orderId) {
    require(commitments[msg.sender][nonce] == 0, "Commitment exists");
    orderId = keccak256(abi.encodePacked(msg.sender, commitHash, block.timestamp));
    commitments[msg.sender][nonce] = commitHash;
    orderStates[orderId] = OrderState.COMMITTED;
    emit OrderCommitted(orderId, msg.sender, block.timestamp);
    nonce[msg.sender]++;
}

// PHASE 2: REVEAL
// Trader reveals actual order details. Contract verifies against stored hash.
function revealOrder(
    bytes32 orderId,
    address market,
    bool isYes,
    uint256 size,
    uint256 limitPrice,
    uint256 expiry,
    bytes32 salt
) external {
    bytes32 expectedHash = keccak256(abi.encodePacked(
        market, isYes, size, limitPrice, expiry, salt
    ));
    require(commitments[msg.sender][orderId] == expectedHash, "Hash mismatch");
    require(block.timestamp <= expiry, "Order expired");

    // Transfer USDC into escrow
    IERC20(USDC).transferFrom(msg.sender, address(this), size);

    revealedOrders[orderId] = RevealedOrder({
        trader: msg.sender, market: market, isYes: isYes,
        size: size, limitPrice: limitPrice, expiry: expiry, salt: salt
    });
    orderStates[orderId] = OrderState.REVEALED;
    emit OrderRevealed(orderId, market, isYes, size);
}

// PHASE 3: MATCH (called by matching engine)
// Records a matched pair, releases funds for settlement
function recordMatch(
    bytes32 buyOrderId,
    bytes32 sellOrderId,
    uint256 matchedSize,
    uint256 matchedPrice
) external onlyMatchingEngine returns (bytes32 pairId) {
    pairId = keccak256(abi.encodePacked(buyOrderId, sellOrderId, block.timestamp));
    matchedPairs[pairId] = MatchedPair({
        buyOrderId: buyOrderId, sellOrderId: sellOrderId,
        matchedSize: matchedSize, matchedPrice: matchedPrice, settled: false
    });
    orderStates[buyOrderId] = OrderState.MATCHED;
    orderStates[sellOrderId] = OrderState.MATCHED;
    emit OrderMatched(pairId, buyOrderId, sellOrderId, matchedSize, matchedPrice);
}

// PHASE 4: SETTLE
// Execute the matched trade through Polymarket's CTF Exchange
function settleMatch(bytes32 pairId) external onlyMatchingEngine {
    MatchedPair storage pair = matchedPairs[pairId];
    require(!pair.settled, "Already settled");

    RevealedOrder storage buyOrder = revealedOrders[pair.buyOrderId];
    RevealedOrder storage sellOrder = revealedOrders[pair.sellOrderId];

    // Call Polymarket CTF Exchange to execute the trade
    // This mints/transfers conditional tokens (Yes/No) between parties
    ICTFExchange(CTF_EXCHANGE).fillOrder(
        buyOrder.trader, sellOrder.trader,
        buyOrder.market, pair.matchedSize, pair.matchedPrice
    );

    pair.settled = true;
    orderStates[pair.buyOrderId] = OrderState.SETTLED;
    orderStates[pair.sellOrderId] = OrderState.SETTLED;
    emit OrderSettled(pairId);
}

// CANCEL: Unmatched orders after expiry can be withdrawn
function cancelExpiredOrder(bytes32 orderId) external {
    RevealedOrder storage order = revealedOrders[orderId];
    require(order.trader == msg.sender, "Not your order");
    require(block.timestamp > order.expiry, "Not expired yet");
    require(orderStates[orderId] == OrderState.REVEALED, "Wrong state");

    IERC20(USDC).transfer(msg.sender, order.size);
    orderStates[orderId] = OrderState.CANCELLED;
}
```

#### Security Considerations

- **Re-entrancy:** All state changes before external calls; use ReentrancyGuard
- **Front-running the reveal:** COMMIT_WINDOW closes before reveals become visible; MEV-protected by bundling reveals + matches in same block
- **Griefing:** Require USDC escrow deposit at reveal time to prevent free option attacks
- **Oracle manipulation:** Use Polymarket's own price as settlement oracle, not external feeds
- **Emergency stop:** Owner can pause commit/reveal phases; existing committed orders still setteable

### 4.2 Tron Port

**File:** `contracts/tron/DarkPoolTron.sol`

Tron uses Solidity-compatible syntax (via TronIDE). Key differences:
- Replace `USDC (ERC-20)` with `USDT (TRC-20)` — most liquid stablecoin on Tron
- Replace `block.timestamp` with `block.number` (Tron block time ~3s, more reliable)
- CTF Exchange replaced with a simple P2P swap contract (no Polymarket on Tron)
- Deploy via TronIDE to Nile Testnet

**Minimal viable port for track eligibility:**
```solidity
// Same commit-reveal mechanics
// Settlement = direct TRC-20 token swap between matched counterparties
// No Polymarket integration — pure dark pool P2P matching
```

**Pitch angle:** "This demonstrates the dark pool primitive is chain-agnostic — same commit-reveal mechanism works on Tron with TRC-20 tokens."

### 4.3 Solana Port

**File:** `programs/dark_pool/src/lib.rs`

Built with Anchor framework. Key differences:
- Accounts-based model (vs. mapping-based EVM model)
- PDAs (Program Derived Addresses) replace mappings for order storage
- SPL tokens replace ERC-20 (use USDC-SPL on devnet)
- Commitment stored in a PDA: `seeds = [b"commit", trader.key().as_ref(), &nonce.to_le_bytes()]`

```rust
// Anchor account struct
#[account]
pub struct OrderCommitment {
    pub trader: Pubkey,
    pub commit_hash: [u8; 32],
    pub timestamp: i64,
    pub state: OrderState,
    pub nonce: u64,
}

// Instruction: commit_order
pub fn commit_order(ctx: Context<CommitOrder>, commit_hash: [u8; 32]) -> Result<()> {
    let commitment = &mut ctx.accounts.commitment;
    commitment.trader = ctx.accounts.trader.key();
    commitment.commit_hash = commit_hash;
    commitment.timestamp = Clock::get()?.unix_timestamp;
    commitment.state = OrderState::Committed;
    Ok(())
}
```

**Pitch angle:** "Same dark pool mechanism on Solana — fast finality (400ms) makes iceberg execution more efficient than on EVM chains."

---

## 5. Commit-Reveal Privacy Scheme

### 5.1 How It Works

The commit-reveal scheme has two phases separated by time:

```
COMMIT PHASE (public, opaque):
  commitment = keccak256(market || isYes || size || limitPrice || expiry || salt)
  → Stored on-chain. No information leaked.

REVEAL PHASE (triggered by matching engine):
  Trader sends: (market, isYes, size, limitPrice, expiry, salt)
  Contract verifies: keccak256(inputs) == stored commitment
  → If valid, order details become known to the contract
  → USDC locked in escrow simultaneously
```

### 5.2 Salt Generation

The salt must be:
- 32 bytes of cryptographically random data
- Never reused (prevents rainbow table attacks)
- Stored securely by the trader (if lost, order cannot be revealed)

```javascript
// Client-side salt generation
const salt = ethers.randomBytes(32);
const commitment = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
  ['address', 'bool', 'uint256', 'uint256', 'uint256', 'bytes32'],
  [market, isYes, size, limitPrice, expiry, salt]
));
```

### 5.3 Privacy Guarantees

| What is visible on-chain | What is hidden |
|--------------------------|----------------|
| That a commitment exists | Market targeted |
| Committer's address | Direction (buy/sell) |
| Commit timestamp | Order size |
| Gas paid | Limit price |
| | Salt value |

**Limitation:** Committer address is visible. For enhanced anonymity, traders should use fresh wallets per large trade — this is standard practice in TradFi dark pools too (prime brokers use intermediary accounts).

### 5.4 Timing Windows

```
T+0:  COMMIT_WINDOW opens — traders submit hashed orders
T+10: COMMIT_WINDOW closes — no new commits
T+10: REVEAL_WINDOW opens — traders reveal their orders
T+15: REVEAL_WINDOW closes — matching engine processes
T+15: MATCH_WINDOW opens — engine records matches on-chain
T+18: MATCH_WINDOW closes — unmatched orders go to iceberg
```

**Why time windows?** If reveals and commits happened simultaneously, a front-runner could watch the mempool for reveal transactions, read the decoded order, and front-run it. The commit window ensures all commitments are locked before any reveals happen.

---

## 6. Off-Chain Matching Engine

### 6.1 Architecture

```
Matching Engine (Node.js service)
├── OrderBook class
│   ├── buySide: Map<marketId, PriceLevel[]>
│   └── sellSide: Map<marketId, PriceLevel[]>
├── Matcher
│   ├── match(revealedOrders[]) → MatchResult[]
│   └── priceTimePriority()
├── ChainListener
│   ├── listenPolygon() — watches for OrderRevealed events
│   └── processReveal(event) → enqueueOrder()
├── Settler
│   ├── recordMatchOnChain(pair) → call DarkPool.recordMatch()
│   └── settleOnChain(pairId) → call DarkPool.settleMatch()
└── IcebergQueue
    ├── queue: Order[]
    └── drip() — executes small slices via Polymarket CLOB API
```

### 6.2 Matching Algorithm

**Price-time priority** (same as traditional CLOB):

```javascript
class Matcher {
  match(revealedOrders) {
    const results = [];

    // Group by market
    const byMarket = groupBy(revealedOrders, o => o.market);

    for (const [market, orders] of byMarket) {
      const buys = orders
        .filter(o => o.isYes)
        .sort((a, b) => b.limitPrice - a.limitPrice || a.timestamp - b.timestamp);

      const sells = orders
        .filter(o => !o.isYes)
        .sort((a, b) => a.limitPrice - b.limitPrice || a.timestamp - b.timestamp);

      let bi = 0, si = 0;
      while (bi < buys.length && si < sells.length) {
        const buy = buys[bi];
        const sell = sells[si];

        // Match condition: buy limit >= sell limit
        if (buy.limitPrice >= sell.limitPrice) {
          const matchedSize = Math.min(buy.remainingSize, sell.remainingSize);
          const matchedPrice = (buy.limitPrice + sell.limitPrice) / 2; // midpoint

          results.push({ buy, sell, matchedSize, matchedPrice });

          buy.remainingSize -= matchedSize;
          sell.remainingSize -= matchedSize;

          if (buy.remainingSize === 0) bi++;
          if (sell.remainingSize === 0) si++;
        } else {
          break; // No more matches possible at these prices
        }
      }
    }

    return results;
  }
}
```

### 6.3 Order Book State

```javascript
// Redis schema for persistence across restarts
// Key: "orderbook:{market}:{side}" (side = "buy" | "sell")
// Value: JSON array of orders sorted by price-time

// Order object
{
  orderId: "0x...",          // bytes32 from contract
  trader: "0x...",           // wallet address
  market: "0x...",           // Polymarket market
  isYes: true,
  size: 10000_000000n,       // 10,000 USDC (6 decimals)
  remainingSize: 10000_000000n,
  limitPrice: 6500,          // 65.00 cents (in basis points of $1)
  expiry: 1743120000,        // unix timestamp
  revealedAt: 1743119700,    // when we saw the reveal event
}
```

### 6.4 Chain Listener (Polygon)

```javascript
// ethers.js v6 event listener
const darkPool = new ethers.Contract(DARK_POOL_ADDRESS, ABI, provider);

darkPool.on('OrderRevealed', async (orderId, market, isYes, size, event) => {
  // Fetch full order details from contract
  const order = await darkPool.revealedOrders(orderId);

  // Add to matching engine
  matchingEngine.enqueue({
    orderId,
    market: order.market,
    isYes: order.isYes,
    size: order.size,
    limitPrice: order.limitPrice,
    expiry: order.expiry,
    revealedAt: Date.now()
  });

  // Run matching after each new order
  await matchingEngine.runMatch();
});
```

---

## 7. Iceberg Order Execution

### 7.1 What Are Iceberg Orders?

When a dark pool order cannot be fully matched internally, the residual must eventually reach the open market. Dumping the full unmatched amount at once would:
1. Reveal the original order size (defeating the privacy purpose)
2. Cause massive price impact

**Iceberg execution** solves this by breaking the residual into small "slices" executed gradually:

```
Original order: 50,000 USDC buy at ~65¢

Dark pool matched: 30,000 USDC  →  settled atomically

Residual: 20,000 USDC  →  Iceberg queue:
  T+0:   Slice 1: 500 USDC at market
  T+45s: Slice 2: 500 USDC at market
  T+90s: Slice 3: 500 USDC at market
  ...    40 slices over ~30 minutes
```

### 7.2 Slice Size Calculation

```javascript
function calculateSliceSize(order) {
  const marketVolume = await getPolymarketDailyVolume(order.market);
  const maxImpact = 0.005; // 0.5% price impact tolerance

  // Slice = max(min_slice, liquidity_based_slice)
  const liquiditySlice = marketVolume * maxImpact;
  const minSlice = 100_000000n; // $100 minimum
  const maxSlice = 1000_000000n; // $1,000 maximum per slice

  return Math.min(maxSlice, Math.max(minSlice, liquiditySlice));
}

// Timing jitter: ±20% randomness to prevent pattern detection
function nextSliceDelay(baseDelay = 45000) {
  return baseDelay * (0.8 + Math.random() * 0.4);
}
```

### 7.3 Polymarket CLOB API Integration

```javascript
// Polymarket CLOB API: https://clob.polymarket.com
const ClobClient = require('@polymarket/clob-client');

async function executeSlice(order, sliceSize) {
  const client = new ClobClient({
    host: 'https://clob.polymarket.com',
    key: process.env.POLYMARKET_API_KEY,
    secret: process.env.POLYMARKET_SECRET,
    passphrase: process.env.POLYMARKET_PASSPHRASE,
    grantType: 'secret',
    signer: new ethers.Wallet(process.env.EXECUTION_PRIVATE_KEY)
  });

  // Place market order for slice
  const orderArgs = {
    tokenID: order.market + (order.isYes ? '-YES' : '-NO'),
    price: order.limitPrice / 10000, // convert basis points to decimal
    size: sliceSize / 1e6,           // convert to USDC units
    side: 'BUY',
    feeRateBps: 0,
    nonce: Date.now(),
    expiration: order.expiry,
  };

  const signedOrder = await client.createOrder(orderArgs);
  return client.postOrder(signedOrder);
}
```

---

## 8. Telegram + OpenAI RFQ Bot

### 8.1 Bot Architecture

```
Telegram User ──DM──► Bot Server (Node.js + grammy)
                           │
                           ▼
                    OpenAI GPT-4o
                    (intent extraction)
                           │
                    ┌──────┴───────┐
                    │              │
                    ▼              ▼
            RFQ Flow         Info Flow
          (place order)    (market data)
                │
                ▼
        Order Builder
        (constructs commitment)
                │
                ▼
        Polygon Signer
        (submits to DarkPool.sol)
```

### 8.2 Conversation Flows

#### RFQ Flow (Place Order)

```
User:  "I want to buy 10k of yes on Trump 2028"
Bot:   "Got it. Here's what I found:

        Market: Will Donald Trump win the 2028 election?
        Current price: 62¢ / share
        Your order: BUY 10,000 USDC of YES
        Limit price: [auto: 65¢ | custom?]

        ⚡ Your order will be committed privately.
        No size or direction visible on-chain.

        Reply YES to confirm, or modify any field."

User:  "yes but limit at 63 cents"
Bot:   "Updated limit: 63¢

        Confirm? (YES/NO)"

User:  "YES"
Bot:   "✅ Order committed to dark pool.
        Commitment hash: 0x3f4a...8b2c
        Searching for match... (up to 10 min)

        I'll notify you when:
        • A match is found
        • Your order starts iceberg execution
        • Settlement is complete"
```

#### Status Flow

```
User:  "/status"
Bot:   "📊 Your active dark pool orders:

        #1 BUY YES 10,000 USDC @ ≤63¢
           Market: Trump 2028
           Status: 🔍 Matching (8 min remaining)
           Dark pool match: $6,200 found ✅
           Iceberg residual: $3,800 executing (slice 4/38)

        #2 SELL NO 5,000 USDC @ ≥40¢
           Market: Kamala 2028
           Status: ⏳ Awaiting reveal window (2 min)"
```

#### Market Data Flow

```
User:  "what's the price on the fed rate cut market?"
Bot:   "📈 Fed Rate Cut ≥25bps (March 2026)

        YES: 73¢  (-2¢ today)
        NO:  27¢  (+2¢ today)

        24h Volume: $2.4M
        Dark pool depth (estimated): $180K

        Want to trade this market? Just say what you'd like to do."
```

### 8.3 OpenAI Intent Extraction

```javascript
const extractOrderIntent = async (userMessage, chatHistory) => {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an order intake assistant for a prediction market dark pool.
        Extract trading intent from natural language.

        Return JSON with fields:
        - action: "buy" | "sell" | "status" | "cancel" | "info" | "unknown"
        - market_query: string (search term for the market)
        - side: "yes" | "no" | null
        - size_usdc: number | null
        - limit_price_cents: number | null (in cents, e.g. 63 for 63¢)
        - urgency: "normal" | "urgent"

        If any field cannot be determined, set to null.
        Be conservative — if unsure, return unknown and ask for clarification.`
      },
      ...chatHistory,
      { role: 'user', content: userMessage }
    ],
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content);
};
```

### 8.4 Bot Commands

```
/start    - Welcome message + wallet setup
/status   - View all active orders
/history  - Past completed orders
/markets  - Browse available markets
/help     - Command list
/cancel   - Cancel an active order
/settings - Configure preferences (slice size, auto-iceberg on/off)
```

### 8.5 Wallet Management for Telegram Users

Since Telegram users may not have wallets:

**Option A (Hackathon-friendly):** Server-side custody
- Bot generates a wallet per Telegram user (stored encrypted in DB)
- User deposits USDC to their bot wallet
- All on-chain operations signed server-side

**Option B (Non-custodial):** WalletConnect integration
- Bot generates a deep link: `wc://connect?...`
- User scans QR in MetaMask/Rabby
- Bot requests signatures, user approves in their wallet app

**Recommendation for 48h:** Option A (custody) for demo. Mention Option B in pitch as production upgrade.

---

## 9. Frontend Dashboard

### 9.1 Scope (Minimal Viable for Demo)

Given 48h constraint, frontend is optional but strengthens the AI track submission and demo quality.

**Priority 1 (must have):**
- Order submission form (commit → reveal flow)
- Active orders table with status
- Market browser (live Polymarket prices via API)

**Priority 2 (nice to have):**
- Dark pool order book depth visualization (anonymized)
- Settlement history
- Iceberg execution progress bar

**Priority 3 (skip):**
- Charts, analytics, user profiles

### 9.2 Tech Stack

```
Framework:    Next.js 15 (App Router)
Styling:      Tailwind CSS + shadcn/ui
Web3:         wagmi v2 + viem
State:        Zustand
Charts:       Recharts (if time permits)
Deployment:   Vercel (instant deploy)
```

### 9.3 Key Components

```
app/
├── page.tsx              - Landing / market browser
├── trade/page.tsx        - Order submission interface
├── dashboard/page.tsx    - Active orders + history
└── api/
    ├── markets/route.ts  - Proxy Polymarket API
    └── orders/route.ts   - Proxy to backend

components/
├── OrderForm.tsx         - Commit-reveal order flow (step wizard)
├── OrderTable.tsx        - Active orders with status badges
├── MarketCard.tsx        - Market tile with price + volume
└── IcebergProgress.tsx   - Slice execution visualization
```

### 9.4 Order Form UX Flow

```
Step 1: Select Market
  [Search box: "Trump 2028..."]
  [MarketCard grid with prices]

Step 2: Build Order
  Direction:  [YES] [NO]
  Size:       [$____] USDC
  Limit:      [Auto (±2% slippage)] [Custom: $____¢]
  Expiry:     [10 min] [30 min] [1 hour] [custom]

Step 3: Review & Commit
  Summary card showing anonymized order
  "Your commitment hash: 0x..."
  [COMMIT ORDER] button → triggers wallet signature

Step 4: Monitor
  "Matching in progress..."
  Progress indicator for each phase
```

---

## 10. Tech Stack Decisions

### 10.1 Backend

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Runtime | Node.js 22 (LTS) | Team familiarity; excellent ethers.js support |
| Framework | Express.js | Minimal boilerplate for hackathon speed |
| Database | Redis 7 | In-memory order book + persistence; perfect for matching engine state |
| ORM | None | Direct Redis commands for order book operations |
| Job queue | Bull (Redis-backed) | Iceberg slice scheduling |
| Web3 | ethers.js v6 | Best Polymarket/Polygon ecosystem support |
| Testing | Vitest | Fast, ESM-native |

### 10.2 Smart Contracts

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Solidity | 0.8.20 | Latest stable with custom errors, immutables |
| Framework | Hardhat | Faster iteration than Foundry for hackathon |
| Testing | Hardhat + Chai | Integrated, minimal setup |
| Network (dev) | Hardhat local | Instant mining for testing |
| Network (demo) | Mumbai (Polygon testnet) | Polymarket has staging here |
| Tron IDE | TronIDE web | Browser-based, no local setup needed |
| Solana | Anchor 0.30 | Most mature Solana smart contract framework |

### 10.3 Frontend

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Framework | Next.js 15 | Fast deploy on Vercel; API routes eliminate separate server |
| Web3 | wagmi v2 | Best-in-class React hooks for wallet interaction |
| UI | shadcn/ui | Pre-built components; no design time wasted |
| Deployment | Vercel | 0-config deploy from GitHub push |

### 10.4 Bot

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Telegram SDK | grammy.js | Modern, TypeScript-first, excellent docs |
| AI | OpenAI GPT-4o | Best intent extraction accuracy; JSON mode |
| Hosting | Railway.app | 1-click Node.js deploy with env var management |

### 10.5 Infrastructure

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Hosting | Railway (backend) + Vercel (frontend) | Free tier sufficient for demo |
| RPC | Alchemy (Polygon) | Most reliable, free tier 300M CU/month |
| Secrets | .env files | Hackathon-scope; mention Vault in pitch |
| Monitoring | None (log to console) | Scope not justified in 48h |

---

## 11. Data Models & API Contracts

### 11.1 Order Object

```typescript
interface DarkPoolOrder {
  // Identifiers
  orderId: `0x${string}`;           // bytes32 from contract
  commitHash: `0x${string}`;        // keccak256 commitment

  // Order details (hidden pre-reveal)
  market: `0x${string}`;            // Polymarket market address
  conditionId: string;              // Polymarket condition ID
  isYes: boolean;                   // true = YES, false = NO
  sizeUsdc: bigint;                 // in USDC units (6 decimals)
  limitPriceBps: number;            // 0-10000 (basis points of $1)
  expiryTimestamp: number;          // unix seconds
  salt: `0x${string}`;             // 32 bytes random

  // Execution state
  state: 'PENDING_COMMIT' | 'COMMITTED' | 'PENDING_REVEAL' | 'REVEALED' |
         'MATCHING' | 'MATCHED' | 'SETTLING' | 'SETTLED' |
         'ICEBERG' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

  // Match data (populated when matched)
  matchedPairId?: `0x${string}`;
  matchedSize?: bigint;
  matchedPrice?: number;

  // Iceberg data (populated if residual)
  icebergSlices?: IcebergSlice[];
  icebergExecuted?: bigint;

  // Timestamps
  committedAt: number;
  revealedAt?: number;
  matchedAt?: number;
  settledAt?: number;
}

interface IcebergSlice {
  sliceId: string;
  size: bigint;
  executedPrice?: number;
  polymarketOrderId?: string;
  state: 'PENDING' | 'SUBMITTED' | 'FILLED' | 'FAILED';
  scheduledAt: number;
  executedAt?: number;
}
```

### 11.2 REST API Endpoints

```
POST   /api/orders/commit
  Body: { commitHash: string, traderAddress: string }
  Response: { orderId: string, txHash: string }

POST   /api/orders/reveal
  Body: { orderId, market, isYes, size, limitPrice, expiry, salt }
  Response: { txHash: string, icebergSliceSize: number }

GET    /api/orders/:orderId
  Response: DarkPoolOrder

GET    /api/orders?trader=0x...
  Response: DarkPoolOrder[]

GET    /api/markets
  Response: PolymarketMarket[] (proxied from Polymarket API)

GET    /api/markets/:conditionId/price
  Response: { yes: number, no: number, volume24h: number }

GET    /api/orderbook/:market
  Response: { depth: number, estimatedBuyPressure: string } // anonymized

POST   /api/admin/match           (internal, protected)
POST   /api/admin/settle/:pairId  (internal, protected)
```

### 11.3 WebSocket Events (for live dashboard)

```
ws://api/ws

Server → Client events:
  order.committed    { orderId, timestamp }
  order.revealed     { orderId, market, isYes (NO SIZE SENT), timestamp }
  order.matched      { orderId, pairId, timestamp }
  order.settled      { orderId, pairId, timestamp }
  iceberg.slice      { orderId, sliceNumber, totalSlices, timestamp }
  iceberg.complete   { orderId, timestamp }

Note: No size/price data is sent over WebSocket until settlement
to avoid leaking order book information.
```

---

## 12. 48-Hour Implementation Phases

### Hour 0-2: Environment Setup (ALL)

- [ ] Create GitHub repo, invite team members
- [ ] Initialize monorepo: `contracts/`, `backend/`, `frontend/`, `bot/`
- [ ] Install dependencies (Hardhat, Next.js, grammy, ethers.js)
- [ ] Set up `.env.example` with all required keys
- [ ] Create Alchemy app (Polygon Mumbai RPC)
- [ ] Create Telegram bot via @BotFather
- [ ] Get OpenAI API key
- [ ] Set up Railway project for backend + bot
- [ ] Set up Vercel project for frontend

### Hour 2-10: Smart Contract Core (Contract Dev)

- [ ] Write `DarkPool.sol` — commit, reveal, recordMatch, settleMatch
- [ ] Write `interfaces/ICTFExchange.sol` — Polymarket CTF interface stub
- [ ] Write `interfaces/IERC20.sol` — standard ERC-20 interface
- [ ] Write Hardhat tests for all 4 phases (commit → reveal → match → settle)
- [ ] Test commit-reveal with wrong salt (should fail)
- [ ] Test order expiry + cancellation
- [ ] Deploy to Hardhat local network
- [ ] Deploy to Mumbai testnet
- [ ] Note deployed contract address in `.env`

### Hour 2-10: Matching Engine Core (Backend Dev 1)

- [ ] Set up Express server + Redis connection
- [ ] Implement `OrderBook` class with `enqueue()` and `dequeue()`
- [ ] Implement `Matcher` class with price-time priority algorithm
- [ ] Write unit tests for matching logic
- [ ] Implement `ChainListener` with ethers.js event subscription
- [ ] Connect ChainListener → Matcher → Settler pipeline

### Hour 2-10: Telegram Bot (Backend Dev 2 / Bot Dev)

- [ ] Set up grammy bot with session middleware
- [ ] Implement `/start` and `/help` commands
- [ ] Implement OpenAI intent extraction function
- [ ] Implement RFQ conversation flow (DM → intent → confirm → submit)
- [ ] Connect bot order submission to API server
- [ ] Test full flow: message → parsed intent → committed order

### Hour 10-18: Integration (Full Team)

- [ ] Connect ChainListener to deployed Mumbai contract
- [ ] Run matching engine against live testnet events
- [ ] Test end-to-end: bot order → commit tx → reveal tx → match → settle
- [ ] Implement iceberg queue with Bull jobs
- [ ] Test iceberg execution against Polymarket staging CLOB
- [ ] Deploy backend to Railway
- [ ] Set up Telegram webhook (vs polling) for production

### Hour 18-24: Frontend (if bandwidth available)

- [ ] Scaffold Next.js app with wagmi + shadcn
- [ ] Build `OrderForm.tsx` — step wizard for commit-reveal
- [ ] Build `OrderTable.tsx` — active orders with live WebSocket updates
- [ ] Build `MarketCard.tsx` — market browser
- [ ] Connect frontend to deployed API
- [ ] Deploy to Vercel

### Hour 18-26: Multi-Chain Ports (Track Dev)

- [ ] Copy `DarkPool.sol` to `tron/DarkPoolTron.sol`
- [ ] Modify for TRC-20 (USDT), update imports for TronIDE
- [ ] Deploy to Nile Testnet via TronIDE
- [ ] Test commit-reveal on Tron
- [ ] Scaffold Anchor project for Solana
- [ ] Implement commit_order instruction + OrderCommitment account
- [ ] Deploy to Solana devnet
- [ ] Test basic commitment storage

### Hour 26-36: Testing & Hardening

- [ ] Write Hardhat coverage report — target >80% for smart contracts
- [ ] Test edge cases: double-commit, expired reveal, partial match
- [ ] Test iceberg with small (10 USDC) orders on testnet
- [ ] Stress test matching engine: 100 simulated orders
- [ ] Fix any bugs found
- [ ] Security review: re-entrancy, integer overflow, access control

### Hour 36-44: Demo Preparation

- [ ] Record demo video (Loom, 3 minutes max)
  - [ ] Segment 1: Bot usage — natural language order submission
  - [ ] Segment 2: On-chain commit transaction (Polygonscan showing only hash)
  - [ ] Segment 3: Matching engine finds counterparty
  - [ ] Segment 4: Settlement transaction on Polygonscan
  - [ ] Segment 5: Iceberg execution visible in bot status
- [ ] Prepare live demo environment (funded testnet wallets)
- [ ] Seed demo with 3-4 pre-committed orders for instant match demo
- [ ] Write project description for each track submission

### Hour 44-48: Submission

- [ ] Write README with architecture diagram
- [ ] Submit to Prediction Markets track (primary)
- [ ] Submit to AI/Bots track (Telegram + OpenAI angle)
- [ ] Submit Tron contract to Tron track
- [ ] Submit Solana program to Solana track
- [ ] Prepare 3-minute pitch deck (5 slides max)

---

## 13. Team Workstreams & Assignments

Recommended breakdown for a team of 3-5:

| Role | Responsibilities | Skills needed |
|------|-----------------|---------------|
| **Contract Dev** | DarkPool.sol, Tron port, Solana port | Solidity, Hardhat, Anchor |
| **Matching Engine Dev** | Matching algorithm, ChainListener, Settler, Redis | Node.js, ethers.js |
| **Bot Dev** | grammy bot, OpenAI integration, order flow | Node.js, OpenAI API |
| **Frontend Dev** | Next.js dashboard, wagmi integration | React, TypeScript, wagmi |
| **Trading/PM** | Polymarket API integration, demo preparation, pitch | Domain expertise |

**Minimum viable team (3 people):**
- Person 1: Contract Dev + Tron/Solana ports
- Person 2: Matching Engine + API server
- Person 3: Bot + Frontend + demo prep

---

## 14. Hackathon Track Strategy

### Track 1: Prediction Markets (PRIMARY)

**Angle:** "First dark pool for prediction markets — enables institutional-size trades without information leakage"

**Demo focus:**
- Show price impact of a large Polymarket trade (before)
- Show the same trade through dark pool — no visible order (after)
- Matching and settlement via Polymarket CTF Exchange

**Key differentiators:**
- Actual Polymarket integration (not just conceptual)
- Commit-reveal provides genuine privacy
- Iceberg execution is novel in this space

### Track 2: AI/Bots

**Angle:** "Natural language trading interface — just DM the bot what you want to trade"

**Demo focus:**
- Show conversational RFQ flow
- Highlight OpenAI intent extraction parsing complex queries
- "The AI handles the complexity of commit-reveal under the hood"

**Key differentiators:**
- First NLP-driven prediction market order entry
- Context-aware (tracks conversation for multi-turn order modification)
- Could become voice-enabled (mention as roadmap)

### Track 3: Tron

**Angle:** "Chain-agnostic dark pool primitive — same commit-reveal mechanism on Tron using TRC-20"

**Demo focus:**
- Deploy contract on Nile testnet
- Show identical commit-reveal flow working on Tron
- "Dark pool infrastructure for Tron-based prediction markets"

**Key differentiators:**
- No Tron dark pool exists today
- Tron has $50B+ in stablecoins (USDT) — massive addressable market
- Low transaction fees make iceberg execution cheap

### Track 4: Solana

**Angle:** "400ms finality enables more efficient iceberg execution — Solana dark pool for high-frequency prediction market trading"

**Demo focus:**
- Anchor program on devnet accepting commitments
- Explain how Solana's speed makes the reveal→match→settle cycle faster
- "Sub-second settlement makes commit windows shorter, leaking less information"

**Key differentiators:**
- Solana's speed genuinely improves the privacy model (shorter commit windows = less timing side-channel)
- No Solana prediction market dark pool exists

### Pitch Narrative (All Tracks)

**Hook (10 seconds):** "Every time a whale buys prediction market shares, the price jumps before they're done. We built a dark pool to stop that."

**Problem (30 seconds):** On-chain prediction markets are fully transparent. Large trades are front-run instantly. Institutional traders can't participate without giving away their positions.

**Solution (60 seconds):** A commit-reveal dark pool where:
1. You hash your order → submit the hash (nothing is revealed)
2. All orders in the batch are revealed simultaneously → matched privately
3. Unmatched portions drip slowly to the market via iceberg orders
4. A Telegram bot handles everything in natural language

**Traction (20 seconds):** Deployed on 3 chains. Working Telegram bot. Integrated with real Polymarket contracts.

**Market (20 seconds):** Prediction markets are a $2B market growing 10x. Institutional adoption is blocked by information leakage. Dark pools are standard in TradFi — we bring them to prediction markets.

---

## 15. Testing & Demo Strategy

### 15.1 Smart Contract Tests

```javascript
// hardhat test suite outline

describe("DarkPool", () => {
  describe("Commit Phase", () => {
    it("stores commitment hash without revealing order details")
    it("emits OrderCommitted event with only orderId and trader")
    it("rejects duplicate commitments from same trader+nonce")
  })

  describe("Reveal Phase", () => {
    it("accepts valid reveal matching stored hash")
    it("rejects reveal with wrong salt")
    it("rejects reveal after expiry")
    it("locks USDC in escrow on reveal")
    it("emits OrderRevealed without price or size in event log")
  })

  describe("Match Phase", () => {
    it("only matching engine can call recordMatch")
    it("records matched pair with correct sizes")
    it("transitions both orders to MATCHED state")
  })

  describe("Settle Phase", () => {
    it("calls CTF Exchange with correct parameters")
    it("marks pair as settled")
    it("reverts on double-settle attempt")
  })

  describe("Cancellation", () => {
    it("allows trader to cancel after expiry")
    it("returns USDC to trader on cancel")
    it("prevents cancelling matched orders")
  })
})
```

### 15.2 Demo Script

**Pre-seeded state (set up before judges arrive):**
- 3 wallets funded with Mumbai USDC
- Wallet A: queued BUY YES 5,000 USDC on "Will ETH hit $5,000 in 2026?" @ 62¢
- Wallet B: queued SELL NO 4,000 USDC on same market @ 40¢ (= SELL YES effectively)
- Both orders in COMMITTED state

**Live demo steps:**
1. Open Telegram, show the bot: "how much is the ETH $5k market?"
2. Bot responds with live price
3. Say: "I want to sell another 2000 USDC of yes at 65 cents"
4. Bot extracts intent, confirms, submits commit tx
5. Open Polygonscan — show only the hash on-chain (no order details)
6. Trigger reveal window (via admin button or direct API call)
7. Show matching engine log: "MATCH FOUND: 4,000 USDC at 62¢"
8. Show Polygonscan settlement tx
9. Open bot, type `/status` — show completed order + iceberg progress for the 1,000 USDC residual
10. Show Polygonscan iceberg slice tx (small ~100 USDC transaction)

**Total demo time: ~4 minutes**

### 15.3 Fallback Plan

If testnet is down or Polymarket staging is unavailable:
- Run on Hardhat local network (always works)
- Mock CTF Exchange with a simple `MockCTFExchange.sol` that emits events
- Pre-record the demo video as backup

---

## 16. Risk Register & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Polymarket CTF Exchange ABI changes | Low | High | Maintain local ABI snapshot; use staging environment |
| Mumbai testnet congestion | Medium | Medium | Deploy backup to Sepolia; maintain local Hardhat env |
| OpenAI rate limits during demo | Low | Medium | Implement fallback: command-based bot (no AI) |
| Matching engine misses reveals | Medium | High | Implement catch-up scan: query OrderRevealed events from last N blocks on startup |
| USDC not available on testnet | Low | High | Use MockUSDC contract with faucet function |
| Tron/Solana ports incomplete | High | Low | These are bonus; core value is Polygon + bot |
| Salt loss (user loses their salt) | Medium | High | Bot stores encrypted salt server-side for demo accounts |
| Front-running the reveal | Medium | Medium | Bundle reveals + matches in same block using Flashbots (mention in pitch) |
| Team member falls asleep | High | High | Assign 4-hour sleep rotations; critical path is Polygon contract + bot |

---

## 17. Post-Hackathon Roadmap

### Phase 1: Security & Production Readiness (Week 1-4)

- Replace custodial bot wallet with WalletConnect deep links
- Formal audit of `DarkPool.sol` (Sherlock or Code4rena)
- Replace Mock CTF Exchange interface with live Polymarket contract calls
- Add signature-based authentication to API endpoints
- Replace Redis with persistent database (PostgreSQL) for order history
- Deploy to Polygon mainnet (real USDC)

### Phase 2: Privacy Enhancement (Month 2-3)

- Implement ZK commitment: replace keccak hash with Pedersen commitment
- Add Tornado Cash-style mixer for wallet obfuscation (if legally permissible)
- Explore EIP-7702 (account abstraction) for more sophisticated privacy
- Research Aztec/Noir for ZK proof generation in-browser

### Phase 3: Market Making & Liquidity (Month 3-6)

- Build professional market maker dashboard (not Telegram)
- Implement RFQ protocol for large institutional orders (>$100K)
- Add multi-leg orders (spreads, collars)
- Integrate Kalshi API for cross-venue dark pool
- Launch on Solana mainnet via Drift Protocol integration

### Phase 4: DAO & Decentralization (Month 6-12)

- Launch governance token for fee sharing
- Decentralize matching engine via threshold signature scheme
- Replace centralized matching engine with on-chain CLOB (if gas costs allow)
- Cross-chain dark pool: route orders to best-price venue across Polymarket + Kalshi + Metaculus

---

## Appendix A: Key Contracts & Addresses

| Contract | Network | Address |
|----------|---------|---------|
| DarkPool.sol | Mumbai (testnet) | TBD at deploy |
| Polymarket CTF Exchange | Polygon Mainnet | `0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E` |
| USDC | Polygon Mainnet | `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` |
| USDC | Mumbai Testnet | `0x0FA8781a83E46826621b3BC094Ea2A0212e71B23` |
| DarkPoolTron.sol | Nile Testnet | TBD at deploy |
| dark_pool (Anchor) | Solana Devnet | TBD at deploy |

## Appendix B: Polymarket API Endpoints

```
Gamma (markets API): https://gamma-api.polymarket.com
CLOB (order API):    https://clob.polymarket.com
WebSocket:           wss://ws-subscriptions-clob.polymarket.com/ws/market

Key endpoints:
  GET  /markets?closed=false&limit=20    - Browse markets
  GET  /markets/{condition_id}           - Market details
  GET  /book?token_id={id}              - Live order book
  POST /order                            - Place CLOB order
  GET  /orders/{id}                      - Order status
```

## Appendix C: Repo Structure

```
penn-hackathon-darkpool/
├── contracts/
│   ├── DarkPool.sol
│   ├── interfaces/
│   │   ├── ICTFExchange.sol
│   │   └── IERC20.sol
│   ├── mocks/
│   │   ├── MockUSDC.sol
│   │   └── MockCTFExchange.sol
│   ├── tron/
│   │   └── DarkPoolTron.sol
│   ├── test/
│   │   └── DarkPool.test.js
│   ├── hardhat.config.js
│   └── package.json
│
├── programs/                          # Solana Anchor
│   └── dark_pool/
│       ├── src/lib.rs
│       └── Cargo.toml
│
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── matching/
│   │   │   ├── OrderBook.js
│   │   │   └── Matcher.js
│   │   ├── chain/
│   │   │   ├── ChainListener.js
│   │   │   └── Settler.js
│   │   ├── iceberg/
│   │   │   └── IcebergQueue.js
│   │   └── routes/
│   │       ├── orders.js
│   │       └── markets.js
│   ├── test/
│   └── package.json
│
├── bot/
│   ├── src/
│   │   ├── index.js
│   │   ├── handlers/
│   │   │   ├── rfq.js
│   │   │   └── status.js
│   │   └── ai/
│   │       └── intentExtractor.js
│   └── package.json
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── trade/page.tsx
│   │   └── dashboard/page.tsx
│   ├── components/
│   └── package.json
│
├── .env.example
├── docker-compose.yml               # Redis + backend for local dev
└── README.md
```

---

*Plan version 1.0 — Generated 2026-03-27 for Penn Blockchain Hackathon '26*
*Privacy: Commit-Reveal | Primary: Polygon/Polymarket | Tracks: Prediction Markets, Tron, Solana, AI/Bots*
