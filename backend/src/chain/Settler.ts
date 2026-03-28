import { EventEmitter } from 'node:events';
import { ethers } from 'ethers';
import type { MatchResult } from '../types/orders.js';

const ARBITER_ABI = [
  'function recordAndFulfillMatch(uint64 buyEscrowId, uint64 sellEscrowId, uint256 matchedPrice, uint256 matchedSize)',
  'function owner() view returns (address)',
];

export class Settler extends EventEmitter {
  private arbiterContract: ethers.Contract;
  private signer: ethers.Wallet;
  private pendingSettlements: Map<string, MatchResult> = new Map();

  constructor(
    rpcUrl: string,
    arbiterAddress: string,
    privateKey: string,
  ) {
    super();
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, provider);
    this.arbiterContract = new ethers.Contract(arbiterAddress, ARBITER_ABI, this.signer);
  }

  /**
   * Settle a matched pair on-chain via the DarkPoolArbiter.
   * This calls recordAndFulfillMatch which:
   * 1. Records the match in the arbiter's storage
   * 2. Fulfills both Alkahest escrows atomically
   */
  async settleMatch(match: MatchResult): Promise<string> {
    const { pairId, buyOrderId, sellOrderId, matchedPriceBps, matchedSizeUsdc } = match;

    console.log(`[Settler] Settling match ${pairId}: buy ${buyOrderId} <> sell ${sellOrderId}`);
    console.log(`[Settler] Price: ${matchedPriceBps} bps, Size: ${matchedSizeUsdc.toString()} USDC`);

    // Extract Alkahest escrow IDs from order IDs (format: "alkahest-{id}")
    const buyEscrowId = this.extractEscrowId(buyOrderId);
    const sellEscrowId = this.extractEscrowId(sellOrderId);

    try {
      const tx = await this.arbiterContract.recordAndFulfillMatch(
        buyEscrowId,
        sellEscrowId,
        matchedPriceBps,
        matchedSizeUsdc,
      );

      console.log(`[Settler] Settlement tx submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`[Settler] Settlement confirmed in block ${receipt?.blockNumber}`);

      this.emit('settled', { pairId, txHash: tx.hash, blockNumber: receipt?.blockNumber });
      this.pendingSettlements.delete(pairId);

      return tx.hash;
    } catch (error) {
      console.error(`[Settler] Settlement failed for ${pairId}:`, error);
      this.emit('settlement-failed', { pairId, error });
      throw error;
    }
  }

  /**
   * Queue a match for settlement. Used when we want to batch or retry.
   */
  queueSettlement(match: MatchResult): void {
    this.pendingSettlements.set(match.pairId, match);
    console.log(`[Settler] Queued settlement for ${match.pairId}`);
  }

  /**
   * Process all queued settlements.
   */
  async processQueue(): Promise<string[]> {
    const txHashes: string[] = [];

    for (const [pairId, match] of this.pendingSettlements) {
      try {
        const txHash = await this.settleMatch(match);
        txHashes.push(txHash);
      } catch (error) {
        console.error(`[Settler] Failed to settle ${pairId}, will retry`);
      }
    }

    return txHashes;
  }

  private extractEscrowId(orderId: string): bigint {
    // Order ID format: "alkahest-{escrowId}" or plain numeric
    const parts = orderId.split('-');
    const idStr = parts.length > 1 ? parts[1] : parts[0];
    return BigInt(idStr);
  }

  getPendingCount(): number {
    return this.pendingSettlements.size;
  }
}
