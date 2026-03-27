## About the Sponsor: Solana

Solana is a high-performance blockchain built for mass adoption. With sub-second finality, transaction costs under a fraction of a cent, and a global community of builders, Solana powers some of the most ambitious applications in DeFi, payments, consumer products, and infrastructure. Learn more at [solana.com](http://solana.com/).

## **Brief Description of Bounty**

Build an application, agent, infrastructure component, or service that leverages the x402 payment protocol to enable AI agents or programmatic clients to autonomously pay for resources over HTTP on Solana. Whether it’s a pay-per-call API, an agent marketplace, MCP server monetization, foundational infrastructure for agentic commerce, or a novel micropayment use case, show us what the agentic economy looks like.

## Prize Information

$1,000

## Objective

Build a working application, agent, infrastructure component, or developer tool that uses the x402 payment protocol to enable autonomous, programmatic payments on Solana. x402 leverages the HTTP 402 “Payment Required” status code to let any API or web service require payment before serving content. No API keys, no subscriptions, no accounts. Participants are challenged to demonstrate how this enables new economic models for the agentic internet. We’re equally excited about end-user applications and foundational infrastructure that makes agentic commerce possible at scale.

## Background Information

x402 is an open, internet-native payment protocol developed by the Coinbase Development Platform team. It uses the HTTP 402 status code - a standard that has existed since HTTP/1.1 but only became practical with blockchain settlement - to enable native payments between clients and servers. A client makes a request, receives a 402 response with payment terms, signs a payment, and retries. The server delegates verification and settlement to a facilitator, then returns the requested content. The protocol is stateless, works with standard HTTP infrastructure, and supports any SPL token.

Solana’s sub-second finality (~400ms) and near-zero transaction costs (~$0.00025) make it the natural settlement layer for x402 micropayments. Major platforms, including Cloudflare, Google, and Vercel, support the protocol, and a growing ecosystem of facilitators, SDKs, and agent wallets is expanding rapidly

**Key Links:**

* Solana: [https://solana.com](https://solana.com)
* x402 Protocol: [https://www.x402.org](https://www.x402.org)
* x402 on Solana: [https://solana.com/x402](https://solana.com/x402)
* Coinbase x402 Docs: [https://docs.cdp.coinbase.com/x402/welcome](https://docs.cdp.coinbase.com/x402/welcome)

## Guidelines and Resources

Projects must settle payments on Solana (mainnet or devnet). Use of the x402 protocol is required.

**Resources:**

* Solana Developer Docs: [https://solana.com/docs](https://solana.com/docs) (You can use the Solana MCP server to give your IDE/Agent access to this resource
* x402 Getting Started Guide: [https://solana.com/developers/guides/getstarted/intro-to-x402](https://solana.com/developers/guides/getstarted/intro-to-x402)
* x402 GitHub (Coinbase reference implementation): [https://github.com/coinbase/x402](https://github.com/coinbase/x402)
* x402 Ecosystem & SDKs: [https://www.x402.org/ecosystem](https://www.x402.org/ecosystem)
* Solana Agentic Payments Guide: [https://solana.com/docs/payments/agentic-payments](https://solana.com/docs/payments/agentic-payments)
* NPM packages: @x402/core, @x402/svm, @x402/fetch, @x402/express, x402-solana
* Deepwiki for the x402 protocol: [https://deepwiki.com/coinbase/x402](https://deepwiki.com/coinbase/x402) (You can use the Deepwiki MCP server to give your IDE/Agent access to this resource)

## Deliverables

1. Working deployment on Solana devnet or mainnet demonstrating at least one x402 payment flow.
2. Public GitHub repository with complete source code.
3. Detailed README with setup/installation instructions and architecture overview.
4. Demo video (~3 minutes) showing the product in action, including at least one end-to-end x402 payment.

## Jugement Criteria

1. Innovation: How novel is the use of x402 and agentic payments? Does it unlock something that wasn’t previously possible?
2. Technical Merit: Quality of code, architecture, and documentation. Proper use of the x402 protocol and Solana’s capabilities.
3. Functionality: Does the solution work as intended? Can a user or agent actually complete a payment flow end-to-end?
4. Impact & Viability: Does this solve a real problem? Could it gain real users or developers?
5. User Experience: Is the interface intuitive? Is the integration seamless?
