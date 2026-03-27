# Swig SDK Reference (Solana Smart Account Bounty)

> Docs: https://build.onswig.com
> GitHub (Protocol/Rust): https://github.com/anagrambuild/swig-wallet
> GitHub (TypeScript): https://github.com/anagrambuild/swig-ts
> NPM: `@swig-wallet/classic` (for @solana/web3.js) or `@swig-wallet/kit` (for @solana/kit)
> Telegram: https://t.me/onswig
> Program: Deployed on Solana devnet/mainnet (use local validator for dev)

## What It Is

Swig is an account abstraction toolkit for Solana. It creates programmable smart wallets with role-based permissions, session keys, spend limits, and social recovery. Think of it as "Safe/Gnosis for Solana" but with finer-grained permissions.

## Core Concepts

### Swig Account
An on-chain PDA (Program Derived Address) that acts as a programmable wallet. Derived from a random 32-byte ID.

### Roles (Authority + Actions)
Each Swig has one or more roles. A role combines:
- **Authority**: WHO can act (Ed25519 keypair, secp256k1, social login, etc.)
- **Actions**: WHAT they can do (manage authorities, transfer tokens, sign arbitrary, etc.)

### Authority Types
- `Ed25519` — Standard Solana keypair
- `Secp256k1` — Ethereum-style keys (cross-chain)
- Social login (via ZK proofs)
- Others: see `AuthorityType` enum in SDK docs

### Actions (Permissions)
- `manageAuthority()` — Can add/remove other roles
- `all()` — Full control (dangerous — use carefully)
- `solTransfer()` — Can transfer SOL
- `splTransfer()` — Can transfer SPL tokens
- `signArbitrary()` — Can sign arbitrary transactions
- More in the SDK: https://anagrambuild.github.io/swig-ts/enums/_swig-wallet_coder.Permission.html

## Installation

```bash
# For @solana/web3.js (classic)
npm install @swig-wallet/classic @solana/web3.js

# For @solana/kit (newer)
npm install @swig-wallet/kit @solana/kit
```

## Local Development

Swig requires its program to be deployed. For local dev, use the provided validator:

```bash
# Clone the TS SDK repo
git clone https://github.com/anagrambuild/swig-ts
cd swig-ts

# Install dependencies
bun install  # or npm install

# Start local validator with Swig program pre-deployed
bun start-validator
```

This spins up a Solana test validator at `http://localhost:8899` with Swig programs loaded.

For devnet, the Swig program should already be deployed. Check the repo for the current program ID.

## Creating a Swig Account (Classic API)

```typescript
import {
  Connection, Keypair, LAMPORTS_PER_SOL,
  Transaction, sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  Actions,
  createEd25519AuthorityInfo,
  findSwigPda,
  getCreateSwigInstruction,
} from "@swig-wallet/classic";

async function createSwigAccount(connection: Connection, user: Keypair) {
  // 1. Generate unique 32-byte ID
  const id = new Uint8Array(32);
  crypto.getRandomValues(id);

  // 2. Derive the Swig PDA
  const swigAddress = findSwigPda(id);

  // 3. Create the root role (authority + permissions)
  const rootAuthorityInfo = createEd25519AuthorityInfo(user.publicKey);
  const rootActions = Actions.set().manageAuthority().get();

  // 4. Build and send the create instruction
  const createSwigIx = await getCreateSwigInstruction({
    payer: user.publicKey,
    id,
    actions: rootActions,
    authorityInfo: rootAuthorityInfo,
  });

  const transaction = new Transaction().add(createSwigIx);
  const signature = await sendAndConfirmTransaction(connection, transaction, [user]);

  console.log("Swig created at:", swigAddress.toBase58());
  return swigAddress;
}
```

## Managing Authorities (Adding Agent Role)

After creating a Swig with a root role, add additional roles for the agent:

```typescript
import {
  Actions,
  createEd25519AuthorityInfo,
  getAddAuthorityInstruction,  // verify exact function name
} from "@swig-wallet/classic";

// Add agent role with restricted permissions
const agentKeypair = Keypair.generate();
const agentAuthorityInfo = createEd25519AuthorityInfo(agentKeypair.publicKey);

// Agent can only transfer SPL tokens (not manage authorities)
const agentActions = Actions.set()
  .splTransfer()    // can transfer SPL tokens (USDC for trading)
  .solTransfer()    // can transfer SOL (for gas)
  .get();

const addAuthorityIx = await getAddAuthorityInstruction({
  swig: swigAddress,
  authority: user.publicKey,  // root authority signs this
  newAuthorityInfo: agentAuthorityInfo,
  newActions: agentActions,
});

const tx = new Transaction().add(addAuthorityIx);
await sendAndConfirmTransaction(connection, tx, [user]);
```

## Signing Transactions with Swig

The agent can sign transactions through the Swig account:

```typescript
import { getSignInstruction } from "@swig-wallet/classic";

// Agent wants to send USDC via the Swig account
const transferIx = createTransferInstruction(
  swigUsdcAccount,    // Swig's USDC token account
  recipientAccount,
  swigAddress,         // Swig is the authority
  amount,
);

// Wrap in Swig signing instruction
const signIx = await getSignInstruction({
  swig: swigAddress,
  authority: agentKeypair.publicKey,
  instruction: transferIx,
});

const tx = new Transaction().add(signIx);
await sendAndConfirmTransaction(connection, tx, [agentKeypair]);
```

## For the Dark Pool Agent Use Case

The plan envisions this role structure:

```
Swig Smart Account:
  Role 1 (OPERATOR): Agent keypair
    - Actions: splTransfer (for trading), limited scope
    - Use: Execute trades within policy

  Role 2 (OWNER): Human's wallet
    - Actions: all() or manageAuthority()
    - Use: Update policies, emergency stop

  Role 3 (RECOVERY): Backup key
    - Actions: manageAuthority() only
    - Use: Key rotation if needed
```

### Emergency Stop (Revoking Agent)
```typescript
import { getRemoveAuthorityInstruction } from "@swig-wallet/classic";

// Owner revokes agent's role
const removeIx = await getRemoveAuthorityInstruction({
  swig: swigAddress,
  authority: ownerKeypair.publicKey,  // owner role
  targetAuthority: agentKeypair.publicKey,  // agent to revoke
});

const tx = new Transaction().add(removeIx);
await sendAndConfirmTransaction(connection, tx, [ownerKeypair]);
```

### Telegram Integration Pattern
```
/agent-status  → Query Swig account on-chain, show roles + balances
/agent-pause   → Call removeAuthority for agent keypair
/set-limit     → NOTE: Swig may not have native spend limits per role.
                 Workaround: use session expiry or re-provision with new limits.
/approve       → For high-value trades: agent submits unsigned tx,
                 human signs via owner role
```

## Key SDK Exports (Classic)

```typescript
// From @swig-wallet/classic
import {
  // Account creation
  findSwigPda,
  getCreateSwigInstruction,

  // Authority management
  createEd25519AuthorityInfo,
  // createSecp256k1AuthorityInfo,  // for EVM keys
  getAddAuthorityInstruction,
  getRemoveAuthorityInstruction,

  // Signing
  getSignInstruction,

  // Permissions
  Actions,  // Builder pattern: Actions.set().manageAuthority().splTransfer().get()
} from "@swig-wallet/classic";
```

## Gotchas & Risks

1. **The plan references `@swig/sdk` and `@swig/wallet-adapter`** — actual packages are `@swig-wallet/classic` or `@swig-wallet/kit`. The plan's package names are WRONG.
2. **Spend limits**: The plan describes per-tx limits and daily spend caps. Swig's current SDK may NOT support these natively. Check the latest docs — you may need to implement limit logic in your own wrapper or use session expiry as a proxy.
3. **Program whitelists**: The plan describes whitelisting specific programs. Verify if Swig supports this — it may need to be enforced at the application layer.
4. **Local validator required**: You can't just deploy to devnet without the Swig program. Use `bun start-validator` from the swig-ts repo, or check if Swig is deployed on devnet.
5. **Session keys**: Swig supports session-based auth but the exact API for time-limited sessions needs verification from the tutorial step 2 (managing authorities).
6. **This is a P4 (nice-to-have) in the plan** — consider cutting if behind schedule.
7. **`Actions` builder**: The `.get()` call at the end is required to finalize the permission set.
