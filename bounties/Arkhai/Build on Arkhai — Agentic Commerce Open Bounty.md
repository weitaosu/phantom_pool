## About the Sponsor: Arkhai

Arkhai builds open market infrastructure for agentic commerce — programmable systems where AI agents discover, negotiate, and settle transactions for compute, energy, and information without centralized intermediaries. Our flagship public good is Alkahest, a general-purpose conditional escrow system on EAS (Ethereum Attestation Service), along with tools like Git Commit Trading and Natural Language Agreements.

## **Brief Description of Bounty**

Build any project that uses or extends Arkhai's open-source tools. We're especially excited about agentic applications where AI agents autonomously manage payments and agreements, but all meaningful integrations are welcome — new protocol contracts, full-stack applications, or novel use cases for trustless P2P exchange.

## Prize Information

\$1,000

## Objective

Build a project that uses or extends any of Arkhai's open-source tools. The goal is to expand the ecosystem of trustless peer-to-peer exchange — whether through new protocol contracts (arbiters, escrow types, fulfillment formats), full-stack applications (bounty markets, SLA platforms, agent service exchanges), or novel integrations of existing tools. We are especially interested in agentic applications where AI agents autonomously create, fulfill, and arbitrate escrows.

Example directions:

* **New Protocol Contracts (Arbiters, Escrows & Fulfillments):** Solidity implementations of novel arbiters, escrow obligations, or fulfillment types — ZK proofs, oracle data, reputation signals, threshold quorums, or new asset/obligation patterns.
* **Agentic Commerce Applications:** Markets where AI agents autonomously post, fulfill, and settle escrows — agent-to-agent service exchange, autonomous compute procurement, self-managing data pipelines.
* **NLA Domain Applications:** Full-stack builds that co-design escrow structure, fulfillment format, and arbitration logic for a specific domain (legal agreements, SLA enforcement, research deliverables, content moderation).

**Decentralized Service Markets:**

Open markets for compute, APIs, or data services with on-chain settlement and SLA monitoring — generalizing the de-redis-clients proof-of-concept.

## Background Information

Arkhai builds infrastructure for agentic commerce — open markets where AI agents discover, negotiate, and settle transactions for compute, energy, and information without centralized intermediaries. Most markets today were built for humans; Arkhai's thesis is that the future of commerce is agentic, and agents need programmable, open markets to trade in the way they best see fit.

Our core public good is **Alkahest**, a general-purpose conditional escrow system built on EAS (Ethereum Attestation Service), developed because no equivalent existed for EVM. Everything Arkhai builds uses it as a foundation. We also develop **Git Commit Trading** (decentralized test-suite bounties with on-chain settlement), **Natural Language Agreements** (LLM-arbitrated escrows for plain-English demands), and **de-redis-clients** (a proof-of-concept for decentralized cloud service provisioning).

**Main website:**[https://www.arkhai.io](https://www.arkhai.io)

## Guidelines and Resources

**Documentation**

* Full protocol docs (escrow flows, writing custom arbiters, SDK reference): [https://www.arkhai.io/docs](https://www.arkhai.io/docs)

**Repos**

* Alkahest (core protocol + SDKs): [https://github.com/arkhai-io/alkahest](https://github.com/arkhai-io/alkahest)
* Git Commit Trading: [https://github.com/arkhai-io/git-commit-trading](https://github.com/arkhai-io/git-commit-trading)
* Natural Language Agreements: [https://github.com/arkhai-io/natural-language-agreements](https://github.com/arkhai-io/natural-language-agreements)
* de-redis-clients: [https://github.com/arkhai-io/de-redis-clients](https://github.com/arkhai-io/de-redis-clients)

**Alkahest Docs MCP Server** — give your AI coding assistant direct access to Alkahest docs, contract ABIs, SDK methods, and deployment addresses:

*Claude Code:*

claude mcp add alkahest-docs -- npx alkahest-mcp

*Cursor / Windsurf / other MCP clients:*

npx @anthropic-ai/mcp-cli add alkahest-docs -- npx alkahest-mcp

**Agent Skills**

*Claude Code:*

/plugin marketplace add arkhai-io/claude-plugins

/plugin install alkahest-plugin@arkhai-plugins

*ClawHub:*

clawhub install alkahest-developer

clawhub install alkahest-user

Skills are also available as [SKILL.md](http://SKILL.md) files in the docs/skills/ directory of each repo.

**Starter Packet (quickstart guide):**[https://gist.github.com/mlegls/1599650b8998fd12ca3a8e1261accbce](https://gist.github.com/mlegls/1599650b8998fd12ca3a8e1261accbce)

**Local development:** All SDKs include a utility for deploying the full escrow ecosystem to Anvil — no testnet required to get started.

## Deliverables

* GitHub repository with source code
* Detailed README with setup and installation procedures
* Demo video (3–5 minutes) showing the project working end-to-end
* Deployment (local Anvil, testnet, or mainnet — any is acceptable)

## Jugement Criteria

1. **Relevance & Integration:** Does the project meaningfully use or extend Arkhai's tools? Does it demonstrate genuine understanding of the protocol?
2. **Innovation:** How novel is the escrow/fulfillment/arbiter design, or the application domain? Does it unlock use cases not previously possible?
3. **Technical Merit:** Quality of on-chain and off-chain implementation, code clarity, architecture decisions, and documentation.
4. **Functionality:** Does the solution work end-to-end as demonstrated? Are the core flows reliable?
5. **Agentic Potential:** Does the project demonstrate or meaningfully advance autonomous agent participation in commerce — agents as first-class economic actors, not just scripted workflows?
