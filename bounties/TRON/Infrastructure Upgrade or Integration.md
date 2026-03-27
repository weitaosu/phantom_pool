## About the Sponsor: TRON

Tron is an open-source, decentralised, Layer 1 blockchain offering a fast, developer-friendly way for anyone, anywhere, to build and transact onchain.

## **Brief Description of Bounty**

Deliver a review-ready improvement to TRON’s core infrastructure or developer ecosystem, protocol upgrades, EVM-compat tooling, framework/SDK integrations, or actionable fixes to [tronprotocol](https://github.com/tronprotocol), tronbox, tronweb, solc upstream repos (e.g. java-tron / TronWeb / TIPs, etc).

## Prize Information

$1,000

## Objective

Build and submit an open-ended infrastructure contribution that is realistically mergeable or usable by the ecosystem. Your submission must be review-ready, meaning it’s not just a demo, it's a clean implementation with tests, docs, and clear scope.

Your project can be in any of the following directions (choose one primary direction and execute it deeply)

* A concrete improvement to core node behavior or protocol-facing functionality.
* Compatibility improvements that reduce friction for Ethereum-style developers (tooling parity, RPC behaviors, signing/tx formatting, etc.).
* A TRON-oriented design + prototype (and/or TIP) inspired by Ethereum standards like ERC-4337 or EIP-7702, with a clear TRON mapping and a runnable proof-of-concept.
* Plugins, adapters, templates, or deploy/test pipelines that help builders ship faster.
* Improve a TRON SDK or build an integration layer that makes TRON easier to use from a common stack.
* A PR (Pull Request) quality fix (bug/perf/robustness/docs) to **java-tron** with strong evidence and tests.
* Implement a popular / unfinished TIP (or draft a TIP + reference implementation) and submit it properly via the official TIP workflow.

## Background Information

TRON’s ecosystem has strong building blocks (node, SDKs, docs), but adoption improves dramatically when upgrades are practical, well-tested, and easy for developers to integrate. This bounty exists to focus builders on real pain-point fixes and ecosystem-grade contributions, not one-off hackathon demos.

## Guidelines and Resources

**QuickStart Links**

1. Create and set up a TronLink wallet - Please create at least two accounts.([https://www.tronlink.org/](https://www.tronlink.org/))
2. Get test tokens (TRX and USDT) from the Nile testnet faucet ([https://nileex.io/join/getJoinPage](https://nileex.io/join/getJoinPage)). Or receive test tokens from the Telegram bot ([https://developers.tron.network/docs/getting-testnet-tokens-on-tron](https://developers.tron.network/docs/getting-testnet-tokens-on-tron))
3. Getting started with TRON development ([https://forum.trondao.org/t/getting-started-with-tron-development/30818](https://forum.trondao.org/t/getting-started-with-tron-development/30818))

**A) “Review-ready” definition**

Your submission must include:

* Clear scope
* Tests (unit/integration as appropriate)
* Documentation updates (README / usage notes / design notes)
* Reproducible steps

**B) Any tron protocol repos (choose what fits your work)**

* java-tron PR or patch (preferred for protocol fixes).
* TronWeb PR or improvement (preferred for EVM-ish DX compatibility).
* TIP repo PR for standards / protocol change proposals.
* A standalone repo is acceptable only if it is production-minded (packaged, documented, tested) and clearly integrable.

**C) What will be discarded (important)**

* Pure “hello world” demos or thin wrappers
* Incomplete prototypes with no tests/docs
* Forks with minimal changes
* “Concept only” with no working PoC or no clear path to integration
* Generic EVM content that does not map to TRON concretely

**D) If you choose “EIP-inspired porting”**

* You must explain TRON mapping clearly (what changes are needed, what can be done at contract layer vs node layer, what the migration path is).
* Reference the relevant spec(s) (example: ERC-4337 User Operation architecture, EIP-7702).

**Resources**

* [Getting Started With TRON](https://forum.trondao.org/t/getting-started-with-tron-development/30818)
* [TRON Developer Docs](https://developers.tron.network/)
* [TronWeb](https://tronweb.network/docu/docs/intro/)
* [Medium Articles](https://trondao.medium.com/)
* [X Articles](https://x.com/trondao/articles)
* [Nile Testnet Faucet](https://nileex.io/join/getJoinPage)
* [TRON Official Developer Group - TG](http://t.me/TronOfficialDevelopersGroupEn)
* [java-tron](https://github.com/tronprotocol/java-tron)

## Deliverables

 **Code submission** :

* Link to PR(s) against upstream repos

 **Evidence package** :

* Demo video or screen recording showing the change working
* Test output (or CI proof)
* Short Reviewer Notes section

 **Documentation** :

* Updated README/docs showing how devs use the improvement

 **If TIP-related** :

* A TIP PR following the official TIP submission structure.

## Jugement Criteria

* Review readiness: tests, docs, clean scope, easy to verify.
* Impact: solves a real ecosystem pain point or meaningfully improves compatibility.
* Technical quality: correctness, robustness, good engineering tradeoffs.
* Ecosystem fit: aligns with TRON repos/standards and is realistically adoptable.
* Clarity: excellent write-up and demo, easy for maintainers to review.
