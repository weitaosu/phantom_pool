import { EventEmitter } from 'node:events';
import { ethers } from 'ethers';
import type { DarkPoolOrder } from '../types/orders.js';
import { OrderState, Chain } from '../types/orders.js';

// Minimal Alkahest ABI for escrow events
const ALKAHEST_ABI = [
  'event EscrowCreated(uint64 indexed escrowId, address indexed creator, address arbiter, bytes obligation, bytes demand, uint256 expiry)',
  'event EscrowFulfilled(uint64 indexed escrowId, bytes fulfillment)',
  'event EscrowCancelled(uint64 indexed escrowId)',
  'function getEscrow(uint64 escrowId) view returns (tuple(address creator, address arbiter, bytes obligation, bytes demand, uint256 expiry, uint8 state))',
];

// DarkPoolArbiter ABI
const ARBITER_ABI = [
  'event MatchFulfilled(uint64 buyEscrow, uint64 sellEscrow, uint256 price, uint256 size)',
  'event IcebergQueued(uint64 escrowId, uint256 residualSize)',
  'function recordAndFulfillMatch(uint64 buyEscrowId, uint64 sellEscrowId, uint256 matchedPrice, uint256 matchedSize)',
];

// Decode obligation bytes into order parameters
interface DecodedObligation {
  market: string;
  isYes: boolean;
  sizeUsdc: bigint;
  limitPriceBps: number;
  salt: string;
}

function decodeObligation(obligationBytes: string): DecodedObligation | null {
  try {
    const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
      ['address', 'bool', 'uint256', 'uint256', 'bytes32'],
      obligationBytes,
    );
    return {
      market: decoded[0] as string,
      isYes: decoded[1] as boolean,
      sizeUsdc: decoded[2] as bigint,
      limitPriceBps: Number(decoded[3]),
      salt: decoded[4] as string,
    };
  } catch {
    return null;
  }
}

export class AlkahestListener extends EventEmitter {
  private alkahestContract: ethers.Contract;
  private arbiterContract: ethers.Contract;
  private provider: ethers.Provider;
  private arbiterAddress: string;

  constructor(
    rpcUrl: string,
    alkahestAddress: string,
    arbiterAddress: string,
  ) {
    super();
    this.arbiterAddress = arbiterAddress;
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.alkahestContract = new ethers.Contract(alkahestAddress, ALKAHEST_ABI, this.provider);
    this.arbiterContract = new ethers.Contract(arbiterAddress, ARBITER_ABI, this.provider);
  }

  async start(): Promise<void> {
    console.log('[AlkahestListener] Starting event listener...');

    // Listen for new escrows targeting our arbiter
    this.alkahestContract.on('EscrowCreated', async (
      escrowId: bigint,
      creator: string,
      arbiter: string,
      obligation: string,
      demand: string,
      expiry: bigint,
    ) => {
      // Only process escrows directed at our DarkPoolArbiter
      if (arbiter.toLowerCase() !== this.arbiterAddress.toLowerCase()) return;

      console.log(`[AlkahestListener] New escrow #${escrowId} from ${creator}`);

      const decoded = decodeObligation(obligation);
      if (!decoded) {
        console.warn(`[AlkahestListener] Failed to decode obligation for escrow #${escrowId}`);
        return;
      }

      const order: DarkPoolOrder = {
        orderId: `alkahest-${escrowId.toString()}`,
        commitHash: ethers.keccak256(obligation),
        market: decoded.market,
        isYes: decoded.isYes,
        sizeUsdc: decoded.sizeUsdc,
        limitPriceBps: decoded.limitPriceBps,
        expiryTimestamp: Number(expiry),
        salt: decoded.salt,
        chain: Chain.POLYGON,
        escrowId: escrowId.toString(),
        state: OrderState.REVEALED,  // Alkahest escrows are already revealed
        traderAddress: creator,
        createdAt: Date.now(),
        revealedAt: Date.now(),
      };

      this.emit('order', order);
    });

    // Listen for successful match fulfillments
    this.arbiterContract.on('MatchFulfilled', (
      buyEscrow: bigint,
      sellEscrow: bigint,
      price: bigint,
      size: bigint,
    ) => {
      console.log(`[AlkahestListener] Match fulfilled: buy #${buyEscrow} <> sell #${sellEscrow}`);
      this.emit('settled', {
        buyEscrowId: buyEscrow.toString(),
        sellEscrowId: sellEscrow.toString(),
        price: Number(price),
        size,
      });
    });

    console.log('[AlkahestListener] Listening for Alkahest escrow events');
  }

  async stop(): Promise<void> {
    this.alkahestContract.removeAllListeners();
    this.arbiterContract.removeAllListeners();
    console.log('[AlkahestListener] Stopped');
  }

  // Catch up on missed events since a specific block
  async catchUp(fromBlock: number): Promise<DarkPoolOrder[]> {
    const orders: DarkPoolOrder[] = [];
    const filter = this.alkahestContract.filters.EscrowCreated(null, null, this.arbiterAddress);
    const events = await this.alkahestContract.queryFilter(filter, fromBlock, 'latest');

    for (const event of events) {
      const args = (event as ethers.EventLog).args;
      if (!args) continue;

      const decoded = decodeObligation(args.obligation);
      if (!decoded) continue;

      orders.push({
        orderId: `alkahest-${args.escrowId.toString()}`,
        commitHash: ethers.keccak256(args.obligation),
        market: decoded.market,
        isYes: decoded.isYes,
        sizeUsdc: decoded.sizeUsdc,
        limitPriceBps: decoded.limitPriceBps,
        expiryTimestamp: Number(args.expiry),
        salt: decoded.salt,
        chain: Chain.POLYGON,
        escrowId: args.escrowId.toString(),
        state: OrderState.REVEALED,
        traderAddress: args.creator,
        createdAt: Date.now(),
        revealedAt: Date.now(),
      });
    }

    return orders;
  }
}
