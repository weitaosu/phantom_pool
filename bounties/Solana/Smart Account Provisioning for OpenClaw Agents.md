## About the Sponsor: Solana

Solana is a high-performance blockchain built for mass adoption. With sub-second finality, transaction costs under a fraction of a cent, and a global community of builders, Solana powers some of the most ambitious applications in DeFi, payments, consumer products, and infrastructure. Learn more at [solana.com](http://solana.com/).

## **Brief Description of Bounty**

Build an application that provisions OpenClaw AI agents with secure smart accounts on Solana, distributing signing keys across multiple storage backends (Mac Keychain, iCloud, Ledger, email recovery, etc.). Include a human-facing control interface for setting spend limits, whitelists, firewalls, and behavioral guardrails that the agent must always follow.

## Prize Information

$1,000

## Objective

Build an application that provisions OpenClaw AI agents with secure, policy-controlled smart accounts on Solana. Today, most AI agents operate with a single private key stored in a plaintext file - a security model that wouldn’t be acceptable for a $50 PayPal account, let alone an autonomous agent managing real funds. This bounty challenges participants to fix that.

The application should create a Solana smart account (using Squads Protocol or Swig) for an OpenClaw agent, with signing keys distributed across multiple secure storage backends, and - critically - a human-facing control interface where the agent’s owner can define and manage the rules their agent must always follow

Some requirements to keep in mind (modify them as required)

* Distributed Key Storage: Signing keys or key shares should be stored across multiple backends - for example, Mac Keychain (and Windows Credential Manager / Linux Secret Service equivalents), iCloud Keychain (and Google Password Manager / Samsung Pass equivalents), email-based recovery, and/or hardware wallets like Ledger. The goal is that no single compromised storage backend can drain the account.
* Human Control Interface: A dashboard or management UI where the agent’s owner can view agent activity and define rules the agent must always follow. This is the human’s control plane over their autonomous agent. It should support:
* Spend controls: per-transaction limits, daily/weekly/monthly budgets, token-type restrictions.
* Whitelists and blacklists: approved destination addresses, blocked addresses, allowed/disallowed programs and protocols.
* Firewall rules: restrict which websites, APIs, or on-chain programs the agent can interact with.
* Behavioral guardrails: keyword or content filters, priority instructions, forbidden actions - rules the agent should always respect regardless of its own reasoning.
* Approval thresholds: high-value or out-of-policy actions should require human confirmation before execution.
* OpenClaw Integration: The provisioned smart account and its associated rule set should be usable by an OpenClaw agent for autonomous Solana transactions within the defined boundaries.
* Provisioning Flow: A clear setup/onboarding experience where a user can create a smart account, configure key distribution across their chosen backends, set initial policies and guardrails, and connect it to an OpenClaw agent.

## Background Information

OpenClaw is an open-source AI agent framework with growing adoption for autonomous Solana operations. Agents built on OpenClaw can manage wallets, execute trades, and interact with DeFi protocols — but the default key management is rudimentary. A single private key in a JSON file is the norm, which creates unacceptable risk for any agent handling real value.

Squads Protocol is the leading smart account infrastructure on Solana, securing over $10B in assets. It provides multisig wallets with programmable permissions, spending limits, time locks, role-based access controls, and sub-accounts. Swig is a smart wallet SDK built by Anagram that brings account abstraction to Solana. It offers a role-based permission system where each role has an authority mechanism (social logins, keypairs, passkeys, etc.) and a set of granular permissions. Swig supports session keys, delegated access, paymaster functionality, and social recovery — all from an on-chain program account.

Either protocol can serve as the smart account layer. The innovation this bounty seeks is in three areas: (1) the key distribution across platform-native secure storage, (2) a human control interface that makes rule management intuitive and comprehensive, and (3) the provisioning UX that ties it all together for AI agent deployments. Think of it as building the parental controls for autonomous agents - the human stays in charge, the agent stays productive

## Guidelines and Resources

Projects must use either Squads Protocol or Swig (or both) as the smart account layer on Solana. The application must demonstrate key distribution across at least two distinct storage backends. The provisioned account must be functional with an OpenClaw agent on devnet or mainnet.

Resources:

* Solana: [https://solana.com](https://solana.com)
* OpenClaw: [https://github.com/openclaw](https://github.com/openclaw) (AI agent framework)
* Squads Protocol: [https://squads.xyz](https://squads.xyz)
* Squads Developer Docs: [https://docs.squads.so](https://docs.squads.so)
* Squads GitHub (v4): [https://github.com/Squads-Protocol/v4](https://github.com/Squads-Protocol/v4)
* Swig: [https://onswig.com](https://onswig.com)
* Swig Developer Docs: [https://build.onswig.com](https://build.onswig.com)

## Deliverables

* Working application that provisions a Solana smart account with keys distributed across at least two storage backends.
* A human-facing control interface (web, desktop, or CLI) for configuring and managing agent rules: spend limits, whitelists/blacklists, firewall rules, behavioral guardrails, and approval thresholds.
* Integration with an OpenClaw agent executing at least one policy-bounded transaction on Solana devnet or mainnet, plus demonstration of the agent being blocked or escalating when it hits a rule boundary.
* Public GitHub repository with complete source code.
* Detailed README covering setup instructions, architecture, supported key storage backends, security model, rule engine design, and policy configuration.
* Demo video (~3 minutes) showing the full flow: account creation, key distribution, rule configuration via the control interface, and an OpenClaw agent transacting within bounds (and being stopped when it tries to exceed them)

## Jugement Criteria

* Security Model: How robust is the key distribution? What happens if one storage backend is compromised? Is the threat model clearly articulated?
* Control Interface: How well does the human-facing interface let an owner define and manage agent rules? Is it expressive enough to handle real-world scenarios (spend caps, whitelists, firewalls, behavioral guardrails)? Can rules be updated in real time?
* Functionality: Does the full flow work end-to-end? Can an agent transact within policy limits, get blocked when it exceeds them, and escalate to a human when required?
* User Experience: Is the provisioning and rule management flow something a non-technical user could navigate? Is agent activity visible and understandable?
* Technical Merit & Extensibility: Quality of code and architecture. How easily could additional storage backends, rule types, or agent frameworks be added?
