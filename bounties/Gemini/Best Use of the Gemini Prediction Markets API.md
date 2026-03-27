## About the Sponsor: Gemini

Gemini is a global crypto and Web3 platform founded by Cameron and Tyler Winklevoss in 2014, offering a wide range of simple, reliable, and secure crypto products and services to individuals and institutions in over 70 countries. Our mission is to unlock the next era of financial, creative, and personal freedom by providing trusted access to the decentralized future. We envision a world where crypto reshapes the global financial system, internet, and money to create greater choice, independence, and opportunity for all—bridging traditional finance with the emerging cryptoeconomy in a way that is more open, fair, and secure.

## **Brief Description/Objective of Bounty**

This bounty challenges participants to build the most compelling, polished, and useful application powered by the Gemini Prediction Markets API. Projects may take the form of analytics dashboards, automated trading tools, social/discovery layers, research utilities, or any creative product that meaningfully leverages real-time prediction market data.

Build a functional application — a tool, dashboard, bot, widget, or service — that makes creative and meaningful use of one or more Gemini Prediction Markets API endpoints. The ideal project will:

* Fetch, display, or act on live prediction market data in a novel way
* Provide clear value to traders, researchers, or casual users curious about event probabilities
* Demonstrate clean integration with the Gemini API
* Be functional and demonstrable within the hackathon timeframe

## Prize Information

$1,000

## Background Information

Gemini Prediction Markets allow users to trade binary and categorical contracts on real-world outcomes. Each event has one or more tradeable contracts, and contract prices reflect the implied probability of a given outcome (e.g., a price of $0.65 means the market assigns a 65% probability to that outcome).

The Prediction Markets API is publicly accessible and provides:

* List of all active/upcoming/recently settled events with full contract detail
* Per-event data including title, category, status, expiry date, liquidity, and tags
* Per-contract data including bid/ask prices, last trade price, and instrument symbol
* Category browsing endpoints for discovery
* Integration with existing Gemini REST and WebSocket APIs for live order book and ticker data using the contract's instrumentSymbol (e.g., GEMI-FEDJAN26-DN25)

Events span multiple categories including Crypto, Sports, Politics, and Economics — covering both short-duration (hourly price) and longer-duration events. The API is RESTful, requires no authentication for public market data endpoints, and returns JSON responses.

Base URL: [https://api.gemini.com](https://api.gemini.com)  |  Sandbox: [https://api.sandbox.gemini.com](https://api.sandbox.gemini.com)

## Guidelines and Resources

1. Projects must use at least one Gemini Prediction Markets API endpoint as a core data source.
2. Projects must be original work created during the hackathon period.
3. Teams may be up to 4 people. Solo submissions are welcome.
4. Submissions must include a working demo (live URL, video, or locally runnable app) and a link to the source code (e.g., GitHub).
5. Projects may be built in any language or framework.
6. Use of the Gemini sandbox environment is encouraged for any features that place or cancel orders.
7. Projects that interact with real funds must clearly disclose this and handle authentication securely.
8. Submissions must not violate Gemini's Terms of Service or applicable laws.
9. Prediction Markets API Docs: [https://docs.gemini.com/prediction-markets/markets](https://docs.gemini.com/prediction-markets/markets)
10. Gemini REST Market Data (order book, ticker): [https://docs.gemini.com/rest/market-data](https://docs.gemini.com/rest/market-data)
11. Gemini WebSocket Market Data: [https://docs.gemini.com/websocket/market-data](https://docs.gemini.com/websocket/market-data)
12. Gemini Sandbox for safe testing: [https://api.sandbox.gemini.com](https://api.sandbox.gemini.com)
13. Gemini Trading API (place/cancel orders): [https://docs.gemini.com/prediction-markets/trading](https://docs.gemini.com/prediction-markets/trading)
14. Gemini Positions API (orders, positions, volume): [https://docs.gemini.com/prediction-markets/positions](https://docs.gemini.com/prediction-markets/positions)

## Deliverables

Each submission must include all of the following:

1. Project Demo — A live hosted URL, a screen-recorded video walkthrough (max 5 minutes), or step-by-step instructions to run the project locally.
2. Source Code — A public or shared GitHub (or equivalent) repository containing all application code.
3. README — A clear README covering: what the project does, which Gemini API endpoints are used, how to run it, and any known limitations.
4. Short Description — A 2–3 sentence summary of the project suitable for a public showcase page.
5. Team Information — Names and contact details for all team members.

## Judgement Criteria

Submissions will be evaluated by a panel of Gemini engineers and product managers. Projects will be scored on the following equally weighted criteria:

| **Criterion**                   | **Description**                                                                                                                                 | **Weight** |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| **API Integration**             | Depth and correctness of Gemini Prediction Markets API usage. Bonus for combining multiple endpoints or integrating with order book / WebSocket data. | **25%**    |
| **Innovation & Creativity**     | Originality of the concept. Does the project explore a new use case or present prediction market data in an unexpected, valuable way?                 | **25%**    |
| **Technical Execution**         | Code quality, reliability, and absence of critical bugs. Is the application stable and well-structured?                                               | **20%**    |
| **User Experience**             | Clarity and usability of the interface or tool. Would a real user — trader, analyst, or curious observer — find value in this?                      | **20%**    |
| **Completeness & Presentation** | Is the demo functional? Does the README clearly explain the project? Are deliverables complete?                                                       | **10%**    |

Example project ideas (for inspiration, not limitation):

* A real-time probability dashboard showing live contract prices across all active events, with charts and category filters
* An alert bot (Telegram, Discord, or email) that notifies users when a newly listed event matches their interests or when a contract price moves significantly
* A market-making or arbitrage tool that monitors bid/ask spreads and places orders via the Trading API (sandbox mode)
* A research tool that aggregates settled event outcomes and analyzes how well the prediction market calibrated against results
* A shareable widget or browser extension that embeds live prediction market probabilities alongside relevant news articles
