# SDK Reference Docs — DarkPool.trade Hackathon

These docs are designed for Claude Code to understand the actual API surfaces of each SDK used in the project. Each file contains real code examples from official documentation, correct package names, gotchas, and differences from what the plan assumes.

## Files

| File | SDK | Bounty | Risk Level | Priority |
|------|-----|--------|------------|----------|
| `ALKAHEST.md` | Alkahest (Arkhai escrow) | Arkhai ($1k) | Medium | P1 — spike test hours 0-4 |
| `X402.md` | x402 (Coinbase payments) | Solana x402 + TRON AI ($2k) | Medium | P3 — middleware layer |
| `SWIG.md` | Swig (Solana smart accounts) | Solana Smart Accts ($1k) | High | P4 — cut if behind |
| `FILECOIN_SYNAPSE.md` | Synapse (Filecoin storage) | Filecoin ($1k) | Medium | P3 — additive |
| `GEMINI_PREDICTIONS.md` | Gemini Prediction Markets API | Gemini ($1k) | Low | P1 — read-only, fast |
| `POLYMARKET_CLOB.md` | Polymarket CLOB + Gamma | Polymarket ($1k) | Low | P0 — core dependency |
| `TRONWEB.md` | TronWeb (TRON chain) | TRON DeFi + AI ($2k) | Low | P2 — established SDK |

## Critical Corrections vs Plan

The hackathon plan (plan.md) uses some WRONG package names. Here are the corrections:

| Plan Says | Actual Package | Notes |
|-----------|---------------|-------|
| `@alkahest/sdk` | `alkahest-ts` or GitHub install | Verify on npm before installing |
| `@alkahest/contracts` | Part of alkahest-ts repo | Not a separate package |
| `@swig/sdk` | `@swig-wallet/classic` | For @solana/web3.js |
| `@swig/wallet-adapter` | `@swig-wallet/kit` | For @solana/kit |
| `@x402/express` (with old API) | `@x402/express` or `x402-express` | Two different APIs — see X402.md |
| `@filoz/synapse-sdk` `.store()` | `@filoz/synapse-sdk` `.upload()` | Plan's API is fictional — use real SDK |

## Spike Test Checklist (Hours 0-4)

Run these BEFORE committing to each integration:

```bash
# 1. Alkahest — can we deploy locally?
npx alkahest deploy-local  # Does this command exist?
# Fallback: clone alkahest contracts, deploy via Hardhat

# 2. Synapse — can we connect to calibnet?
node -e "
const { Synapse, RPC_URLS } = require('@filoz/synapse-sdk');
Synapse.create({ privateKey: '0x...', rpcURL: RPC_URLS.calibration.websocket })
  .then(s => console.log('Connected!'))
  .catch(e => console.error('FAILED:', e));
"

# 3. Swig — does the validator work?
cd swig-ts && bun start-validator
# Then: can we create a Swig account?

# 4. Gemini — does the events endpoint return data?
curl https://api.gemini.com/v1/prediction-markets/events?status=active | head

# 5. x402 — does the facilitator respond?
curl https://x402.org/facilitator

# 6. Polymarket — can we fetch markets?
curl 'https://gamma-api.polymarket.com/markets?closed=false&limit=5' | head
```

## Usage with Claude Code

Point Claude Code at these files when implementing each bounty:

```
/read docs/sdks/ALKAHEST.md     # Before implementing DarkPoolArbiter
/read docs/sdks/X402.md         # Before implementing x402 middleware
/read docs/sdks/SWIG.md         # Before implementing smart account provisioning
/read docs/sdks/FILECOIN_SYNAPSE.md  # Before implementing agent storage
/read docs/sdks/GEMINI_PREDICTIONS.md # Before implementing cross-venue feed
/read docs/sdks/POLYMARKET_CLOB.md   # Before implementing CLOB integration
/read docs/sdks/TRONWEB.md      # Before implementing TRON contracts
```
