## About the Sponsor: TRON

Tron is an open-source, decentralised, Layer 1 blockchain offering a fast, developer-friendly way for anyone, anywhere, to build and transact onchain.

## **Brief Description of Bounty**

Build an open-ended, end-to-end AI + TRON solution that enables agents to discover services, pay for them (including micro-payments), operate safely, and reduce scams/abuse with strong security and developer tooling.

## Prize Information

$1,000

## Objective

Create a project that makes TRON useful for AI agents doing real commerce. Your submission must be more than a chatbot + token transfer. It must demonstrate a complete, verifiable flow.

Choose one primary direction (go deep):

* **Agentic commerce standards solutions** (standardized checkout/order/payment flows)
* **UCP (Universal Commerce Protocol) on TRON** : proposal + implementation/PoC mapping UCP capabilities (e.g., Checkout/Order) to TRON settlement
* **x402-style payments on TRON** : open-source “HTTP 402 Payment Required” micropayments integration for APIs/services with TRON settlement
* **Micro-transaction enablement proposals** on TRON (metering, receipts, pay-per-call, pay-per-tool, pay-per-message) using a clear on-chain verification pattern
* **Discovery + trust mechanisms beyond ERC-8004** with TRON-friendly identity/reputation/validation concepts and verifiable agent profiles
* **Security-centric agent execution** using TRON EOA permission / multi-signature controls
* **Agentic chargeback / dispute management** as a consumer-safety design
* **OPSEC dev tooling** to prevent crypto scams originating from agent “skills/tools”

## Background Information

Agentic commerce is moving toward interoperable protocols (so agents can interact with merchants/services without custom integrations) and API-native micropayments (so agents can pay per request). UCP is an open standard aimed at agentic commerce interoperability, and x402 uses HTTP 402 Payment Required to make web-native pay-per-use possible.

At the same time, agents need trust/discovery and strong operational security, because agents can be abused to sign malicious transactions or interact with malicious endpoints. ERC-8004 is one example of a public discovery/trust layer concept for agents, and TRON’s permission/multi-sig model can be used to constrain risky operations.

## Guidelines and Resources

**QuickStart Links**

1. Create and set up a TronLink wallet - Please create at least two accounts.([https://www.tronlink.org/](https://www.tronlink.org/))
2. Get test tokens (TRX and USDT) from the Nile testnet faucet ([https://nileex.io/join/getJoinPage](https://nileex.io/join/getJoinPage)). Or receive test tokens from the Telegram bot ([https://developers.tron.network/docs/getting-testnet-tokens-on-tron](https://developers.tron.network/docs/getting-testnet-tokens-on-tron))
3. Getting started with TRON development ([https://forum.trondao.org/t/getting-started-with-tron-development/30818](https://forum.trondao.org/t/getting-started-with-tron-development/30818))

**A) Must be TRON-centered**

* TRON must be essential to the solution (settlement, verification, execution controls, receipts, or policy enforcement).

**B) Must be end-to-end and verifiable**

* Your demo must produce verifiable artifacts (transaction hashes, receipts, signed payloads, or proofs) and show how they map to the app’s state.

**C) What will be discarded**

* Simple “AI chat UI + send TRC20” with no standards/trust/security flow.
* Concept-only proposals with no runnable PoC.
* Forks with minimal changes.

**D) If you build UCP on TRON**

* Implement at least one UCP capability end-to-end (e.g., Checkout or Order), and map payment/receipt verification to TRON.

**E) If you build x402 on TRON**

* Follow x402’s core idea: return HTTP 402 with payment requirements, then retry with a payment proof/authorization, implement a TRON settlement verification step. Optionally build on top of [Bank of AI](https://bankofai.io/) solution

**F) If you build security / multi-sig for agents**

* Use TRON’s Account Permission Management (threshold, keys, operation restrictions, permission_id) to demonstrate safe agent execution.

**G) If you build OPSEC tooling**

* Your tool must be defensive: prevent scams, prevent unsafe signing, and clearly explain risk.

**Resources**

* [Getting Started With TRON](https://forum.trondao.org/t/getting-started-with-tron-development/30818)
* [TRON Developer Docs](https://developers.tron.network/)
* [TronWeb](https://tronweb.network/docu/docs/intro/)
* [Medium Articles](https://trondao.medium.com/)
* [X Articles](https://x.com/trondao/articles)
* [Nile Testnet Faucet](https://nileex.io/join/getJoinPage)
* [TRON Official Developer Group - TG](http://t.me/TronOfficialDevelopersGroupEn)
* [AINFT](https://ainft.com/)
* [Bank Of AI](https://bankofai.io/)
* [TRON Account Permission Management](https://developers.tron.network/docs/multi-signature)

## Deliverables

The application must have:

* A functional user-interface ( web, mobile app,cli, depending on the use case).
* Demo video.
* Github Repository.
* On-chain proof.

## Jugement Criteria

* End-to-end completeness: a real flow that works and is easy to verify.
* Security strength: strong abuse prevention, safe signing, clear threat model, multi-sig/permission use where relevant.
* Standards alignment & interoperability: thoughtful UCP/x402-inspired design, clean interfaces, and reproducible examples.
* Innovation: meaningfully beyond common demos, novel trust/discovery, micropayment mechanics, or chargeback design.
* Documentation & review readiness: clear README, good structure, and easy setup.
