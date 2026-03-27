# TronWeb SDK Reference (TRON Bounties)

> Docs: https://tronweb.network/docu/docs/intro
> GitHub: https://github.com/tronprotocol/tronweb
> NPM: `tronweb`
> Testnet (Nile): https://nile.trongrid.io
> Testnet faucet: https://nileex.io/join/getJoinPage
> Testnet explorer: https://nile.tronscan.org
> Mainnet: https://api.trongrid.io
> USDT TRC-20 (Mainnet): `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`

## What It Is

TronWeb is the JavaScript SDK for interacting with the TRON blockchain. It's analogous to ethers.js/web3.js for Ethereum but with TRON-specific features: TRC-20 tokens, energy/bandwidth resource model, and native account permission management.

## Installation

```bash
npm install tronweb
```

## Initialize

```typescript
import { TronWeb } from 'tronweb';

// Full node connection (Nile testnet)
const tronWeb = new TronWeb({
  fullHost: 'https://nile.trongrid.io',
  privateKey: process.env.TRON_PRIVATE_KEY,  // hex string, no 0x prefix
});

// Mainnet
const tronWebMainnet = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  privateKey: process.env.TRON_PRIVATE_KEY,
});

// With separate nodes
const tronWeb = new TronWeb({
  fullNode: 'https://nile.trongrid.io',
  solidityNode: 'https://nile.trongrid.io',
  eventServer: 'https://nile.trongrid.io',
  privateKey: process.env.TRON_PRIVATE_KEY,
});
```

## Account Basics

```typescript
// Generate new account
const account = tronWeb.createAccount();
// { privateKey: '...', publicKey: '...', address: { base58: 'T...', hex: '41...' } }

// Get balance (TRX, in SUN — 1 TRX = 1,000,000 SUN)
const balance = await tronWeb.trx.getBalance('TAddress...');
const trxBalance = balance / 1_000_000;

// Send TRX
const tx = await tronWeb.trx.sendTransaction('TRecipient...', 1_000_000); // 1 TRX
```

## Smart Contract Deployment (Solidity on TRON)

TRON uses Solidity (compatible with ^0.8.x). Deploy via TronIDE (https://www.tronide.io/) or programmatically:

```typescript
// Deploy contract
const contract = await tronWeb.contract().new({
  abi: contractABI,
  bytecode: contractBytecode,
  feeLimit: 1000_000_000,  // 1000 TRX fee limit
  callValue: 0,
  parameters: [constructorArg1, constructorArg2],
});

console.log('Contract address:', contract.address);
```

## Interact with Deployed Contract

```typescript
// Load existing contract
const contract = await tronWeb.contract(abi, contractAddress);

// Call view function (read-only)
const result = await contract.methods.getBalance(userAddress).call();

// Send transaction (state-changing)
const tx = await contract.methods.deposit(amount).send({
  feeLimit: 100_000_000,  // 100 TRX
  callValue: 0,
});
```

## TRC-20 Token Interaction (USDT)

```typescript
const USDT_ADDRESS = 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj'; // Nile testnet USDT
// Mainnet USDT: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t

const usdtContract = await tronWeb.contract(trc20Abi, USDT_ADDRESS);

// Check balance
const balance = await usdtContract.methods.balanceOf(myAddress).call();

// Approve spending
const approveTx = await usdtContract.methods.approve(
  spenderAddress,
  amount  // USDT has 6 decimals: 1 USDT = 1_000_000
).send({ feeLimit: 100_000_000 });

// Transfer
const transferTx = await usdtContract.methods.transfer(
  recipientAddress,
  amount
).send({ feeLimit: 100_000_000 });

// TransferFrom (after approval)
const transferFromTx = await usdtContract.methods.transferFrom(
  fromAddress,
  toAddress,
  amount
).send({ feeLimit: 100_000_000 });
```

### Standard TRC-20 ABI (minimal)
```json
[
  {"constant":true,"inputs":[{"name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"type":"function"},
  {"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"type":"function"},
  {"constant":false,"inputs":[{"name":"to","type":"address"},{"name":"value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"type":"function"},
  {"constant":false,"inputs":[{"name":"from","type":"address"},{"name":"to","type":"address"},{"name":"value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"type":"function"},
  {"constant":true,"inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"type":"function"}
]
```

## Transaction Verification (for x402-TRON middleware)

```typescript
// Get transaction by hash
const tx = await tronWeb.trx.getTransaction(txHash);
// tx.ret[0].contractRet === 'SUCCESS' means it executed

// Get transaction info (includes logs, fees, etc.)
const txInfo = await tronWeb.trx.getTransactionInfo(txHash);
// txInfo.receipt.result === 'SUCCESS'
// txInfo.log contains event logs (for TRC-20 Transfer events)

// Verify a TRC-20 transfer
function verifyUSDTTransfer(txInfo: any, expectedAmount: string, expectedTo: string): boolean {
  if (!txInfo.log || txInfo.log.length === 0) return false;

  // TRC-20 Transfer event topic
  const TRANSFER_TOPIC = 'ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

  for (const log of txInfo.log) {
    if (log.topics[0] === TRANSFER_TOPIC) {
      // topics[2] is the 'to' address (zero-padded)
      const to = '41' + log.topics[2].slice(24);  // TRON hex address format
      const amount = parseInt(log.data, 16);

      const toBase58 = tronWeb.address.fromHex(to);
      if (toBase58 === expectedTo && amount >= parseInt(expectedAmount)) {
        return true;
      }
    }
  }
  return false;
}
```

## Account Permission Management (for Agent Security)

TRON has native multi-sig/permission management at the account level:

```typescript
// Update account permissions (restrict agent wallet)
const tx = await tronWeb.transactionBuilder.updateAccountPermissions(
  ownerAddress,
  // Owner permission (full control)
  {
    type: 0,
    permission_name: 'owner',
    threshold: 1,
    keys: [{ address: ownerAddress, weight: 1 }],
  },
  // Witness permission (not used for non-SR accounts)
  null,
  // Active permissions (restricted operations)
  [{
    type: 2,
    permission_name: 'agent_trading',
    threshold: 1,
    id: 2,
    keys: [{ address: agentAddress, weight: 1 }],
    operations: '7fff1fc0033e0000000000000000000000000000000000000000000000000000',
    // This hex string is a bitmask of allowed transaction types
    // The above allows: TransferContract, TriggerSmartContract
    // See TRON docs for the full bitmask reference
  }]
);

const signedTx = await tronWeb.trx.sign(tx);
const result = await tronWeb.trx.sendRawTransaction(signedTx);
```

### Permission Operations Bitmask

The `operations` field is a 64-character hex string (256 bits). Each bit enables a specific transaction type:
- Bit 0: `AccountCreateContract`
- Bit 1: `TransferContract` (TRX transfers)
- Bit 2: `TransferAssetContract` (TRC-10)
- Bit 4: `VoteWitnessContract`
- Bit 31: `TriggerSmartContract` (interact with smart contracts)
- ... see TRON docs for full list

For the dark pool agent, you'd enable bits 1 (TRX transfer for gas) and 31 (trigger smart contract for trading).

## DarkPoolTron.sol Pattern

```solidity
// contracts/tron/DarkPoolTron.sol
pragma solidity ^0.8.20;

interface ITRC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract DarkPoolTron {
    ITRC20 public usdt;  // Set in constructor
    address public matchingEngine;

    mapping(address => bool) public marketMakers;
    mapping(address => uint256) public mmBalances;

    struct Order {
        address trader;
        bool isYes;
        uint256 size;        // USDT amount (6 decimals)
        uint256 limitPrice;  // basis points (0-10000)
        uint256 expiry;
        bytes32 commitHash;
        bool revealed;
        bool settled;
    }

    mapping(bytes32 => Order) public orders;

    event LiquidityDeposited(address indexed mm, uint256 amount);
    event OrderCommitted(bytes32 indexed orderId, address indexed trader);
    event MatchSettled(address buyer, address seller, uint256 size, uint256 price);

    constructor(address _usdt, address _matchingEngine) {
        usdt = ITRC20(_usdt);
        matchingEngine = _matchingEngine;
    }

    function depositLiquidity(uint256 amount) external {
        usdt.transferFrom(msg.sender, address(this), amount);
        mmBalances[msg.sender] += amount;
        marketMakers[msg.sender] = true;
        emit LiquidityDeposited(msg.sender, amount);
    }

    function withdrawLiquidity(uint256 amount) external {
        require(mmBalances[msg.sender] >= amount, "Insufficient balance");
        mmBalances[msg.sender] -= amount;
        usdt.transfer(msg.sender, amount);
    }

    function executeMatch(
        address buyer, address seller,
        uint256 matchedSize, uint256 matchedPrice
    ) external {
        require(msg.sender == matchingEngine, "Not matching engine");
        // Transfer logic here
        emit MatchSettled(buyer, seller, matchedSize, matchedPrice);
    }
}
```

## Nile Testnet Setup

1. Go to https://nileex.io/join/getJoinPage
2. Enter your TRON address to get test TRX
3. For testnet USDT, you may need to deploy your own TRC-20 or find a faucet
4. Use TronIDE (https://www.tronide.io/) for contract development and deployment
5. Verify on https://nile.tronscan.org

## Gotchas & Risks

1. **Address format**: TRON uses Base58 addresses starting with `T` (e.g., `TVXxx...`). The hex format starts with `41`. TronWeb converts between them: `tronWeb.address.toHex(base58)` and `tronWeb.address.fromHex(hex)`.
2. **Energy/Bandwidth**: TRON uses energy (for smart contracts) and bandwidth (for basic transfers) instead of gas. On testnet this rarely matters, but on mainnet you need to stake TRX for energy.
3. **Fee limit**: Always set `feeLimit` when sending transactions. Default is usually too low.
4. **USDT decimals**: USDT on TRON has 6 decimals (same as on other chains).
5. **Event logs hex format**: Event log addresses in TRON are hex-encoded with `41` prefix, not `0x`.
6. **Private key format**: TronWeb expects hex private keys WITHOUT the `0x` prefix.
7. **Nile testnet USDT**: May need to deploy your own mock TRC-20 token for testing.
8. **The plan uses `address public constant USDT = 0xa614f803B6FD780986A42c78Ec9c7f77e6DeD13`** — this looks like an EVM address, NOT a TRON address. You'll need the correct Nile testnet USDT address or deploy your own.
9. **TronIDE for deployment**: The easiest path for hackathon. Write Solidity, compile, deploy to Nile in the browser.
