# PBC Hackathon and Researchathon '26

> Open in Granola

## Dark Pool Concept for Prediction Markets

### Core Problem
Insiders want to trade without revealing positions to the public.

- **Current issue:** Large trades on Polymarket signal insider activity through price movements
- **Example:** A 50% price jump signals big insider buying, leading to front-running
- **Solution:** Private trading platform matching buyers/sellers off-market

Dark pools already exist in traditional finance. Orders settle off Polymarket when matched. Unmatched portions are executed via iceberg orders (small batches over time).

---

## Technical Implementation Strategy

### Platform Choice
- Polymarket (Polygon/ETH) vs Kalshi (Solana)
- **Polymarket preferred:** better liquidity for non-sports events, more diversified political markets, crypto-native

### Hackathon Track Optimization
- Multiple tracks available: Solana, Tron, prediction markets
- Goal: maximize track participation for better winning odds

### Integration Possibilities
- OpenAI/Telegram bot for order creation
- RFQ (Request for Quote) system via messaging
- Mobile-first approach for market makers

---

## Privacy and Technical Challenges

**Core challenge:** Blockchain transparency vs privacy needs
- All transactions visible on-chain
- Input/output traceability remains problematic

**Potential solutions:**
- Privacy protocols (ZCash-style)
- Gradual fund mixing/batching
- Mathematical approaches to obscure transaction patterns

> Note: No dedicated privacy track available at hackathon

---

## Hackathon Context

- **Event:** University of Pennsylvania Blockchain Hackathon
- **Team composition:** Mix of trading expertise and technical implementation
- **Strategy:** Target multiple tracks simultaneously for better winning odds
