# Session Plan

**Created:** 2026-03-27
**Intent Contract:** See .claude/session-intent.md

## What You'll End Up With
A working dark pool MVP for Polymarket: commit-reveal smart contracts on Polygon (+ Tron + Solana ports), an off-chain matching engine, iceberg execution via Polymarket CLOB, and a Telegram/OpenAI RFQ bot — all ready to demo in 48 hours.

## Phase Weights
- Discover: 5% — ecosystem already known (Polymarket, CTF Exchange, Polymarket CLOB API)
- Define: 15% — clarify matching algorithm, privacy boundaries, multi-chain scope
- Develop: 65% — contracts, matching engine, bot, iceberg queue, multi-chain ports
- Deliver: 15% — testing, demo script, track submissions

## Execution Commands
To execute this plan, run:
```bash
/octo:embrace "Build dark pool MVP for Polymarket with commit-reveal contracts, matching engine, iceberg execution, and Telegram/OpenAI bot for Penn Hackathon"
```

Or execute phases individually:
- `/octo:develop` (primary — 65% weight)
- `/octo:deliver` (testing + demo prep)

## Provider Requirements
🔴 Codex CLI: Available ✓
🟡 Gemini CLI: Available ✓
🔵 Claude: Available ✓

## Success Criteria
- Commit-reveal contract deployed on Polygon Mumbai testnet
- Telegram bot accepts natural language orders and submits to contract
- Matching engine pairs buyers/sellers and settles through Polymarket
- Iceberg queue executes residual orders as small slices
- Tron and Solana contracts deployed for track eligibility
- Demo video showing full flow (commit → match → settle → iceberg)

## Next Steps
1. Review `plan.md` in project root
2. Assign workstreams per Section 13 (Team Workstreams)
3. Execute with `/octo:embrace` or start directly from Section 12 (48h phases)
