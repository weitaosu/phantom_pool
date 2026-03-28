import { EventEmitter } from 'node:events';
import { Connection, PublicKey } from '@solana/web3.js';
import type { DarkPoolOrder } from '../types/orders.js';
import { OrderState, Chain } from '../types/orders.js';

export class SolanaListener extends EventEmitter {
  private connection: Connection;
  private programId: PublicKey;
  private subscriptionId: number | null = null;

  constructor(rpcUrl: string, programId: string) {
    super();
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.programId = new PublicKey(programId);
  }

  async start(): Promise<void> {
    console.log('[SolanaListener] Starting log listener for program:', this.programId.toBase58());

    // Subscribe to program logs to detect new commitments and reveals
    this.subscriptionId = this.connection.onLogs(
      this.programId,
      (logs) => {
        this.processLogs(logs);
      },
      'confirmed',
    );

    console.log('[SolanaListener] Listening for Solana program events');
  }

  private processLogs(logs: { signature: string; logs: string[] }): void {
    const { signature, logs: logMessages } = logs;

    for (const log of logMessages) {
      // Anchor emits structured logs as base64 in "Program data: ..." lines
      if (log.startsWith('Program data:')) {
        try {
          const data = Buffer.from(log.replace('Program data: ', ''), 'base64');
          this.decodeAndEmit(data, signature);
        } catch {
          // Not our event format
        }
      }

      // Also detect plain log messages from our program
      if (log.includes('OrderCommitted')) {
        this.emit('commitment-detected', { signature, chain: Chain.SOLANA });
      }

      if (log.includes('OrderRevealed')) {
        this.handleRevealLog(log, signature);
      }

      if (log.includes('Settled match')) {
        this.emit('settlement-detected', { signature, chain: Chain.SOLANA });
      }
    }
  }

  private decodeAndEmit(data: Buffer, signature: string): void {
    // Anchor event discriminator is first 8 bytes
    // For hackathon, we use log message parsing rather than full Anchor IDL decoding
    const discriminator = data.subarray(0, 8).toString('hex');
    console.log(`[SolanaListener] Event discriminator: ${discriminator} in tx ${signature}`);
  }

  private handleRevealLog(log: string, signature: string): void {
    // Parse reveal details from structured log
    // Format: "OrderRevealed: market=<pubkey> isYes=<bool> size=<u64> price=<u16>"
    console.log(`[SolanaListener] Reveal detected in tx ${signature}: ${log}`);

    // Emit for matching engine to pick up
    this.emit('order', {
      orderId: `solana-${signature.slice(0, 16)}`,
      commitHash: signature,
      chain: Chain.SOLANA,
      state: OrderState.REVEALED,
      createdAt: Date.now(),
      revealedAt: Date.now(),
    } as Partial<DarkPoolOrder>);
  }

  async stop(): Promise<void> {
    if (this.subscriptionId !== null) {
      await this.connection.removeOnLogsListener(this.subscriptionId);
      this.subscriptionId = null;
    }
    console.log('[SolanaListener] Stopped');
  }

  // Fetch recent commitment PDAs for catch-up
  async fetchRecentCommitments(): Promise<{ pubkey: string; data: Buffer }[]> {
    const accounts = await this.connection.getProgramAccounts(this.programId, {
      filters: [
        { dataSize: 200 }, // Approximate size of OrderCommitment account
      ],
    });

    return accounts.map(a => ({
      pubkey: a.pubkey.toBase58(),
      data: Buffer.from(a.account.data),
    }));
  }
}
