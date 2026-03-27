# Alkahest SDK Reference (Arkhai Bounty)

> Source: https://www.arkhai.io/docs
> GitHub (TS): https://github.com/CoopHive/alkahest-ts
> GitHub (Rust): https://github.com/CoopHive/alkahest-rs
> GitHub (Python): https://github.com/CoopHive/alkahest-py
> Network: Base Sepolia (primary), any EAS-supported chain
> NPM: `@alkahest/sdk` (plan reference) — actual packages may be under `alkahest-ts` or scoped differently. Verify before installing.

## What It Is

Alkahest is an open-source escrow and arbitration system built on EAS (Ethereum Attestation Service). It enables conditional peer-to-peer agreements: one party locks assets in escrow, specifying a "demand" (what they want in return) and an "arbiter" (who decides if the demand is met). When the demand is fulfilled, the arbiter releases the escrow atomically.

## Core Concepts

### Escrow Lifecycle
1. **Lock Phase** (`_lockEscrow`): Verify preconditions, lock the asset/commitment
2. **Wait Phase**: Wait for someone to fulfill the demand
3. **Release Phase** (`_releaseEscrow`): Execute when demand is met
4. **Return Phase** (`_returnEscrow`): Handle expiration if demand never met

### Key Components
- **Obligation**: What the escrow creator is locking up (e.g., ERC-20 tokens)
- **Demand**: What they want in return (encoded as bytes, arbiter-specific)
- **Arbiter**: Smart contract implementing `IArbiter` that validates fulfillment
- **Attestation**: EAS attestation UID returned when escrow/payment is created

### Contract Types
- `ERC20EscrowObligation` — Lock ERC-20 tokens in escrow
- `ERC721EscrowObligation` — Lock ERC-721 NFTs in escrow
- `ERC1155EscrowObligation` — Lock ERC-1155 tokens in escrow
- `TokenBundleEscrowObligation` — Lock mixed bundles
- `ERC20PaymentObligation` — Direct ERC-20 payment (for fulfillment)
- `ERC721PaymentObligation` — Direct ERC-721 payment (for fulfillment)
- Corresponding `BarterUtils` contracts for atomic swaps

## TypeScript SDK Usage

### Installation
```bash
# Check actual package name — may be alkahest-ts or @alkahest/sdk
npm install alkahest-ts
# or from GitHub
npm install github:CoopHive/alkahest-ts
```

### Initialize Client
```typescript
import { AlkahestClient } from 'alkahest-ts'; // verify actual import path

const client = new AlkahestClient({
  privateKey: process.env.PRIVATE_KEY,
  rpcUrl: 'wss://base-sepolia-rpc...' // WebSocket required for Rust SDK; verify for TS
});
```

### ERC-20 for ERC-20 Trade (Barter Utils)
```typescript
// Alice: Create escrow offering USDC for another ERC-20
const escrow = await aliceClient.erc20.buyErc20ForErc20(
  { address: usdcToken, value: 1000000000n },  // what Alice offers
  { address: otherToken, value: 900n },          // what Alice wants
  0n  // no expiration (0 = never expires)
);

// Bob: Fulfill the escrow
const payment = await bobClient.erc20.payErc20ForErc20(escrow.attested.uid);
```

### ERC-20 for ERC-721 Trade
```typescript
// Alice escrows ERC-20, demanding an ERC-721
const escrow = await aliceClient.erc20.buyErc721WithErc20(
  { address: usdcToken, value: 1000000000n },
  { address: erc721Token, id: 42n },
  0n
);

// Bob fulfills with the ERC-721
const payment = await bobClient.erc721.payErc721ForErc20(escrow.attested.uid);
```

### Custom Arbiter Escrow (What DarkPool Needs)
```typescript
// Create escrow with a CUSTOM arbiter (our DarkPoolArbiter)
const escrow = await aliceClient.erc20.buyWithErc20(
  { address: usdcToken, value: 1000000000n },
  {
    arbiter: darkPoolArbiterAddress,  // our custom arbiter contract
    demand: customDemandBytes         // ABI-encoded demand data
  },
  0n
);
```

### Raw Contract Interaction (viem)
```typescript
import { encodeAbiParameters, parseAbiParameters } from 'viem';

// Encode demand for ERC-20 payment
const demand = encodeAbiParameters(
  parseAbiParameters('(address token, uint256 amount, address payee)'),
  [{ token: '0x...', amount: parseEther('1000'), payee: alice }]
);

// Approve escrow contract to spend tokens
await walletClient.writeContract({
  address: erc20Token,
  abi: erc20Abi,
  functionName: 'approve',
  args: [erc20EscrowObligation, parseEther('1000')],
});

// Create escrow
const hash = await walletClient.writeContract({
  address: erc20EscrowObligation,
  abi: erc20EscrowAbi,
  functionName: 'doObligation',
  args: [
    {
      token: erc20Token,
      amount: parseEther('1000'),
      arbiter: erc721PaymentObligation,  // or custom arbiter
      demand: demand,
    },
    BigInt(Math.floor(Date.now() / 1000) + 86400),  // 24h expiry
  ],
});
```

### Fulfilling & Collecting Escrow
```typescript
// Bob fulfills Alice's demand (pays ERC-721)
const paymentTx = await walletClient.writeContract({
  address: erc721PaymentObligation,
  abi: erc721PaymentAbi,
  functionName: 'doObligation',
  args: [{ token: erc721Token, tokenId: tokenId, payee: alice }],
});
const paymentReceipt = await publicClient.waitForTransactionReceipt({ hash: paymentTx });
const paymentUid = getAttestedEventFromReceipt(paymentReceipt).uid;

// Bob collects Alice's escrowed ERC-20
await walletClient.writeContract({
  address: erc20EscrowObligation,
  abi: erc20EscrowAbi,
  functionName: 'collectEscrow',
  args: [escrowUid, paymentUid],
});
```

### Reclaiming Expired Escrow
```typescript
await walletClient.writeContract({
  address: erc20EscrowObligation,
  abi: erc20EscrowAbi,
  functionName: 'reclaimExpired',
  args: [escrowUid],
});
```

## Writing a Custom Arbiter (DarkPoolArbiter)

Arbiters implement the `IArbiter` interface with a single key function:

```solidity
interface IArbiter {
    function checkObligation(
        Attestation memory obligation,
        bytes memory demand,
        bytes32 counteroffer
    ) external view returns (bool);
}
```

### Arbiter Pattern
1. Validate attestation integrity via `ArbiterUtils._checkIntrinsic()`
2. Verify schema and source (if applicable)
3. Decode obligation data and demand data
4. Apply validation logic
5. Return boolean

### Synchronous Arbiter Example (Single-tx)
```solidity
contract DarkPoolArbiter is IArbiter {
    using ArbiterUtils for Attestation;

    struct DemandData {
        bytes32 marketId;
        uint256 minPrice;
        bool isYes;
    }

    function checkObligation(
        Attestation memory obligation,
        bytes memory demand,
        bytes32 counteroffer
    ) external view override returns (bool) {
        if (!obligation._checkIntrinsic()) return false;
        if (counteroffer != bytes32(0) && obligation.refUID != counteroffer) return false;

        DemandData memory demandData = abi.decode(demand, (DemandData));
        // ... your matching logic here
        return true;
    }
}
```

### Asynchronous Arbiter (Multi-tx, state accumulation)
For cases where validation spans multiple transactions (e.g., voting, oracle feeds):
- Maintain state via mappings
- Accumulate evidence across multiple `castVote` / `submitData` calls
- `checkObligation` returns `false` until completion threshold is reached

## Local Development

```bash
# Deploy Alkahest contracts locally (Anvil/Hardhat)
npx alkahest deploy-local
```

**IMPORTANT**: Verify this command exists. The plan references it but it may not be in the current SDK. Fallback: clone the Alkahest contracts repo and deploy via Hardhat/Forge manually.

## Deployed Addresses

Alkahest is deployed on Base Sepolia. Check the GitHub repo for current contract addresses:
- `ERC20EscrowObligation`
- `ERC20PaymentObligation`
- `ERC721EscrowObligation`
- `ERC721PaymentObligation`
- `TokenBundleEscrowObligation`
- `TokenBundlePaymentObligation`
- Various `BarterUtils` contracts
- `TrivialArbiter` (always returns true — useful for testing)
- `TrustedPartyArbiter`

## Gotchas & Risks

1. **Package naming**: The plan says `@alkahest/sdk` and `@alkahest/contracts` but actual packages may be `alkahest-ts`, `alkahest-rs`, `alkahest-py`. Verify on npm/GitHub.
2. **WebSocket RPC required**: The Rust SDK explicitly requires `wss://` URLs, not `https://`. TS SDK may differ.
3. **Base Sepolia only**: As of latest docs, only Base Sepolia is confirmed. The plan deploys to Polygon Mumbai / Sepolia — verify Alkahest is actually deployed there.
4. **`_lockEscrow` msg.sender**: The escrow contract itself is `msg.sender` during lock, NOT the user. Token approvals must happen in a separate tx before escrow creation.
5. **EAS dependency**: All escrows are EAS attestations. You need EAS deployed on your target chain.
6. **`deploy-local` command**: Verify this actually exists before relying on it.
