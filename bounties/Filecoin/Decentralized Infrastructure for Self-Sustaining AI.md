## About the Sponsor: Filecoin

Filecoin is the world’s largest decentralized storage network. Filecoin Foundation's mission is to preserve humanity's most important information, as well as to facilitate the open source governance of the Filecoin network, fund research and development projects for decentralized technologies, and support the growth of the Filecoin ecosystem and community.

## **Objective of Bounty**

To build a decentralized operating layer where AI agents can exist as first-class citizens.

Participants must create a system where agents can autonomously manage their own identity, store their "memory" and logs on Filecoin, negotiate for resources, and engage in peer-to-peer commerce without human oversight.

## Prize Information

\$1,000

## Background Information

Current AI agents are often tethered to centralized APIs and ephemeral storage, making them "stateless" and dependent on human funding. By leveraging Filecoin (via FOC) and Ethereum-based smart contracts, we can provide agents with:

* Permanence: Long-term storage for state and logs.
* Identity: Verifiable history and reputation.
* Sovereignty: The ability to earn, spend, and negotiate for storage deals autonomously.

## Ideas

1. **Agent Storage SDK**

Build a framework-agnostic SDK that enables AI agents to autonomously store, retrieve, and manage data on Filecoin via FOC without human intervention. Bounty Description Minimal agent storage interface (store, retrieve, renew, prune) Agent-usable wallet abstraction with cross-chain funding Default storage policies (cost, redundancy, TTL) Deployment on calibnet (mainnet bonus) with integration docs

2. **Onchain Agent Registry**

Deploy AI agents as first-class onchain entities with persistent metadata, state, and logs stored on Filecoin, enabling large-scale discovery and coordination. Bounty Description Ethereum-based registry contracts Filecoin-backed metadata, state, and execution logs Multi-agent coordination demo Explorer/dashboard visualizing agents and storage activity

3. **Agent Reputation & Portable Identity**

Design a tamper-resistant, portable identity system where agent reputation is derived from verifiable history anchored on Filecoin. Bounty Description CID-rooted identity objects stored on Filecoin Reputation scoring from historical data Proof-of-history demo Cross-environment identity portability + verifier tooling

4. **Autonomous Agent Economy**

Create a live onchain economic environment where AI agents operate under real cost constraints and must sustain themselves. Bounty Description Onchain budget and fee rules Filecoin-backed agent state Live agent cohort under real economic limits Transparent dashboard + post-mortem analysis

5. **Fee-Gated Agent Communication**

Build a secure, peer-to-peer messaging protocol for AI agents with onchain fee enforcement and Filecoin-backed message archives. Bounty Description Encrypted P2P agent messaging Onchain fee/staking mechanism Filecoin-backed message persistence Live demo with spam-resistance experiment

6. **Autonomous Infrastructure Brokerage**

Develop broker agents that autonomously evaluate, negotiate, and manage Filecoin storage deals for other agents. Bounty Description Storage deal comparison + recommendation engine Automated deal creation and migration Onchain commission/fee model Metrics dashboard (deals, savings, retention)

7. **Agent-Generated Data Marketplace**

Build a marketplace where AI agents generate, price, and sell Filecoin-backed datasets with verifiable provenance and onchain settlement. Bounty Description Marketplace contracts (listing, escrow, settlement) CID-rooted dataset storage Producer + consumer agent demo Revenue and transaction dashboard

## Guidelines and Resources

Your project MUST leverage Filecoin Onchain Cloud for data storage using Synapse SDK or Filecoin Pin.

* Filecoin Onchain Cloud Docs

[https://filecoin.cloud/](https://filecoin.cloud/)

[https://docs.filecoin.cloud/getting-started/](https://docs.filecoin.cloud/getting-started/)

* Starter Kit

[https://github.com/FIL-Builders/fs-upload-dapp](https://github.com/FIL-Builders/fs-upload-dapp)

* Filecoin Pin

[https://docs.filecoin.io/builder-cookbook/filecoin-pin](https://docs.filecoin.io/builder-cookbook/filecoin-pin)

* AI Agents Identity and Filecoin pin

[https://docs.filecoin.io/builder-cookbook/filecoin-pin/erc-8004-agent-registration](https://docs.filecoin.io/builder-cookbook/filecoin-pin/erc-8004-agent-registration)

* More on Synapse SDK

[https://github.com/FilOzone/synapse-sdk/tree/master/apps/synapse-playground](https://github.com/FilOzone/synapse-sdk/tree/master/apps/synapse-playground)

## Deliverables

* Github Repository
* Demo Video
* Project Description

## Judgement Criteria

* Novelty and practicality of the idea and how wisely Filecoin Onchain Cloud is integrated.
