# Filecoin Synapse SDK Reference (Filecoin Bounty)

> Docs: https://docs.filecoin.cloud/getting-started/
> GitHub: https://github.com/FilOzone/synapse-sdk
> NPM: `@filoz/synapse-sdk`
> Network: Filecoin Calibration testnet (calibnet)
> RPC: `https://api.calibration.node.glif.io/rpc/v1` (HTTP) or `wss://wss.calibration.node.glif.io/apigw/lotus` (WebSocket)

## What It Is

Synapse SDK is a TypeScript SDK for Filecoin's "Onchain Cloud" — a smart-contract-based marketplace for decentralized storage. It handles uploading data to Filecoin storage providers, managing payments, and retrieving data via CIDs.

**IMPORTANT**: This is a REAL storage SDK, not a simple key-value store. It's designed for file storage with Proof of Data Possession (PDP). For the hackathon's "agent memory" use case, you're essentially storing JSON blobs as files on Filecoin.

## ⚠️ Breaking Changes (v0.24.0+)

- "Pandora" is now "Warm Storage"
- "Proof Sets" are now "Data Sets"
- "Roots" are now "Pieces"
- "Storage Providers" are now "Service Providers"

## Installation

```bash
npm install @filoz/synapse-sdk
```

Requires Node.js 20+.

## Prerequisites

Before using the SDK on calibnet:
1. Get a Filecoin calibnet wallet (MetaMask configured for Filecoin Calibration)
2. Get test tFIL from faucet: `https://faucet.calibnet.chainsafe-fil.io`
3. Get test USDFC tokens (needed for storage payments)
4. Deposit USDFC into the payment system

## Initialize SDK

```typescript
import { Synapse, RPC_URLS } from '@filoz/synapse-sdk';

// Option 1: With private key (backend)
const synapse = await Synapse.create({
  privateKey: process.env.FILECOIN_PRIVATE_KEY,  // 0x... format
  rpcURL: RPC_URLS.calibration.websocket,
  // or: rpcURL: 'https://api.calibration.node.glif.io/rpc/v1'
});

// Option 2: With GLIF authorization
const synapse = await Synapse.create({
  privateKey: '0x...',
  rpcURL: 'https://api.node.glif.io/rpc/v1',
  authorization: 'Bearer YOUR_GLIF_TOKEN',
});

// Option 3: Browser with MetaMask
import { ethers } from 'ethers';
const provider = new ethers.BrowserProvider(window.ethereum);
const synapse = await Synapse.create({ provider });
```

## Upload Data (Store Agent Memory)

```typescript
// Create storage service
const storage = await synapse.createStorage();

// Upload raw data (JSON string → Uint8Array)
const data = JSON.stringify({
  event_type: 'news_analysis',
  timestamp: Date.now(),
  article_headline: 'Fed raises rates 50bps',
  affected_markets: 2,
  edge_found: 0.19,
  action_taken: 'BUY_YES',
  outcome: null,
});

const uploadResult = await storage.upload(
  new TextEncoder().encode(data)
);

console.log(`Uploaded! PieceCID: ${uploadResult.pieceCid}`);
// pieceCid is the CID you store as the "memory" reference
```

### Upload with Callbacks

```typescript
const storage = await synapse.createStorage({
  callbacks: {
    onProviderSelected: (provider) => {
      console.log(`Selected provider: ${provider.owner}`);
    },
    onProofSetResolved: (info) => {
      if (info.isExisting) {
        console.log(`Using existing proof set: ${info.proofSetId}`);
      } else {
        console.log(`Created new proof set: ${info.proofSetId}`);
      }
    },
  }
});

const result = await storage.upload(data);
```

## Download / Retrieve Data

```typescript
// Download by CID
const downloaded = await synapse.download(cid);
// `downloaded` is a Uint8Array — decode to string
const text = new TextDecoder().decode(downloaded);
const parsed = JSON.parse(text);
```

## Preflight Check (Before Upload)

```typescript
const preflight = await storage.preflightUpload(dataBuffer.length);
if (!preflight.allowanceCheck.sufficient) {
  console.error('Insufficient USDFC allowance — deposit more');
  throw new Error('Allowance not sufficient');
}
```

## Payments Setup

Before uploading, you need USDFC deposited in the payment system:

```typescript
// This is a more complex flow involving:
// 1. Approve USDFC spending
// 2. Deposit into payment rail
// 3. Approve operator (storage provider)
// The web UI at https://fs-upload-dapp.netlify.app handles this interactively

// Programmatic deposit (simplified):
const payments = synapse.payments;
await payments.depositWithPermitAndApproveOperator(
  depositAmount,      // e.g., parseUnits("2.5", 18) for 2.5 USDFC
  operatorAddress,    // storage provider address
  rateAllowance,
  lockupAllowance,
  maxLockupPeriod,
);
```

## For the Dark Pool Use Case (Agent Memory + Logs)

The plan uses Synapse as a "store JSON, get CID" system. Here's the practical pattern:

```typescript
class AgentStorage {
  private synapse: Synapse;
  private storage: any; // StorageService type

  async init() {
    this.synapse = await Synapse.create({
      privateKey: process.env.FILECOIN_PRIVATE_KEY,
      rpcURL: RPC_URLS.calibration.websocket,
    });
    this.storage = await this.synapse.createStorage();
  }

  // Store a JSON object, return its CID
  async store(data: object): Promise<string> {
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    const result = await this.storage.upload(encoded);
    return result.pieceCid;  // or result.commp — verify field name
  }

  // Retrieve a JSON object by CID
  async retrieve(cid: string): Promise<object> {
    const data = await this.synapse.download(cid);
    return JSON.parse(new TextDecoder().decode(data));
  }
}
```

### What to Store (per the plan)

1. **Agent identity**: `{ name, version, capabilities, created_at }` → store once, save CID
2. **Order logs**: `{ orderId, market, timestamp, result }` → store per order
3. **News analysis**: `{ headline, markets_affected, edge, action, outcome }` → store per analysis
4. **Reputation**: Aggregate stats computed from stored memory entries

### Demo Strategy

For the hackathon demo:
- **Pre-store** several entries before the demo (calibnet can be slow)
- Show the CIDs live in the dashboard
- Link to Filecoin explorer to prove the data is on-chain
- The "reputation report" can be computed client-side from the stored CIDs

## CommP (Piece Commitment) Utilities

```typescript
import { calculate, asCommP } from '@filoz/synapse-sdk/commp';

// Calculate CommP from data
const data = new Uint8Array([1, 2, 3, 4]);
const commp = calculate(data);
console.log(commp.toString()); // baga6ea4seaq...

// Validate CommP strings
const valid = asCommP('baga6ea4seaqao7s73y24kcutaosvacpdjgfe5pw76ooefnyqw4ynr3d2y6x2mpq');
```

## Calibnet Faucets

- tFIL: https://faucet.calibnet.chainsafe-fil.io (100 tFIL/request)
- USDFC: Check the Filecoin Cloud web app or docs for testnet USDFC distribution

## Gotchas & Risks

1. **Calibnet is SLOW**: Filecoin block time is ~30 seconds. Uploads may take minutes. Pre-store demo data.
2. **Payment setup required**: You can't just upload — need tFIL for gas AND USDFC deposited for storage fees. Budget 30-60 min for first-time setup.
3. **Not a key-value store**: Synapse is a file storage system. You upload bytes, get a CID. There's no "list all my files" — you need to track CIDs yourself.
4. **The plan references `SynapseClient`** with methods like `.store()` and `.list()` — the actual SDK uses `Synapse.create()` → `storage.upload()`. The plan's API surface is FICTIONAL.
5. **ERC-8004 not in SDK**: The plan mentions "ERC-8004 agent registration." This is NOT part of Synapse SDK — it would be a separate smart contract pattern if it exists at all. Likely skip this.
6. **CID format**: Synapse returns PieceCIDs (CommP format like `baga6ea4seaq...`), not standard IPFS CIDs.
7. **WebSocket RPC preferred**: The SDK works better with WebSocket endpoints.
8. **File size limit**: Currently 254 MiB per file (via FilCDN).
9. **No persistence guarantees on calibnet**: This is a testnet — data may not persist.
