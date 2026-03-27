# Session Intent Contract

**Created:** 2026-03-27
**Project:** Dark Pool for Prediction Markets

## Job Statement
Build a working MVP dark pool trading platform for Polymarket (Polygon/ETH) that allows insiders to trade large positions without revealing order size or direction on-chain, using a commit-reveal privacy scheme and a Telegram/AI bot interface. Target all 4 hackathon tracks (Prediction Markets, Solana, Tron, AI/Bots) in a 48h sprint.

## Success Criteria
- [x] Working MVP demo deployable on testnet that judges can interact with
- [x] Commit-reveal smart contract on Polygon testnet (primary)
- [x] Telegram RFQ bot that accepts and routes orders
- [x] Off-chain matching engine that settles matched pairs on Polymarket
- [x] Iceberg order execution for unmatched portions
- [x] Multi-track eligibility: Tron port, Solana port, AI bot interface

## Boundaries
- Scope limited to 48h hackathon sprint
- Privacy mechanism: commit-reveal only (no ZK proofs)
- No production custody of real funds
- Matching engine can be centralized for demo purposes

## Context
- Team has trading expertise + technical implementation skills
- Polymarket preferred (better liquidity, crypto-native)
- Multiple track participation strategy for better winning odds
