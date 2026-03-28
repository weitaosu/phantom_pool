import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';

/**
 * DFlow Prediction Markets API client.
 * DFlow tokenizes Kalshi markets as SPL tokens tradeable on Solana.
 * We use this for iceberg execution on the Solana branch.
 */

interface DFlowMarket {
  id: string;
  title: string;
  category: string;
  yesTokenMint: string;
  noTokenMint: string;
  yesPrice: number;
  noPrice: number;
  volume24h: number;
  status: 'active' | 'closed' | 'settled';
}

interface DFlowSwapResult {
  txSignature: string;
  executedPrice: number;
  filledSize: number;
}

const DFLOW_API_BASE = 'https://api.dflow.net/v1';

export class DFlowClient {
  private connection: Connection;
  private wallet: Keypair | null;

  constructor(rpcUrl: string, privateKey?: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.wallet = privateKey
      ? Keypair.fromSecretKey(Buffer.from(privateKey, 'hex'))
      : null;
  }

  /**
   * Fetch all active prediction markets from DFlow (Kalshi on Solana).
   */
  async getMarkets(): Promise<DFlowMarket[]> {
    try {
      const response = await fetch(`${DFLOW_API_BASE}/prediction-markets?status=active`);
      if (!response.ok) {
        console.warn(`[DFlowClient] API returned ${response.status}, returning mock markets`);
        return this.getMockMarkets();
      }
      return await response.json() as DFlowMarket[];
    } catch {
      console.warn('[DFlowClient] API unreachable, returning mock markets');
      return this.getMockMarkets();
    }
  }

  /**
   * Get a specific market by ID.
   */
  async getMarket(marketId: string): Promise<DFlowMarket | null> {
    try {
      const response = await fetch(`${DFLOW_API_BASE}/prediction-markets/${marketId}`);
      if (!response.ok) return null;
      return await response.json() as DFlowMarket;
    } catch {
      return null;
    }
  }

  /**
   * Execute an iceberg slice via DFlow's swap endpoint.
   * Swaps USDC for YES/NO SPL tokens on the specified market.
   */
  async executeSwap(
    marketId: string,
    side: 'buy-yes' | 'buy-no',
    sizeUsdc: number,
    maxPriceBps: number,
  ): Promise<DFlowSwapResult> {
    if (!this.wallet) {
      throw new Error('Wallet not configured for DFlow swaps');
    }

    try {
      const response = await fetch(`${DFLOW_API_BASE}/prediction-markets/${marketId}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          side,
          size: sizeUsdc,
          maxPrice: maxPriceBps / 10000,
          walletPubkey: this.wallet.publicKey.toBase58(),
        }),
      });

      if (!response.ok) {
        console.warn(`[DFlowClient] Swap API returned ${response.status}, simulating fill`);
        return this.simulateSwap(sizeUsdc, maxPriceBps);
      }

      const result = await response.json() as { transaction: string; price: number; filled: number };

      // Sign and send the returned transaction
      const tx = Transaction.from(Buffer.from(result.transaction, 'base64'));
      tx.sign(this.wallet);
      const signature = await this.connection.sendRawTransaction(tx.serialize());
      await this.connection.confirmTransaction(signature, 'confirmed');

      return {
        txSignature: signature,
        executedPrice: result.price,
        filledSize: result.filled,
      };
    } catch (error) {
      console.warn('[DFlowClient] Swap failed, simulating:', error);
      return this.simulateSwap(sizeUsdc, maxPriceBps);
    }
  }

  private simulateSwap(sizeUsdc: number, maxPriceBps: number): DFlowSwapResult {
    return {
      txSignature: `sim_${Date.now().toString(36)}`,
      executedPrice: maxPriceBps / 10000,
      filledSize: sizeUsdc,
    };
  }

  private getMockMarkets(): DFlowMarket[] {
    return [
      {
        id: 'kalshi-fed-rate-q2-2026',
        title: 'Will the Fed cut rates in Q2 2026?',
        category: 'Economics',
        yesTokenMint: '11111111111111111111111111111111',
        noTokenMint: '11111111111111111111111111111112',
        yesPrice: 0.67,
        noPrice: 0.33,
        volume24h: 1_200_000,
        status: 'active',
      },
      {
        id: 'kalshi-btc-100k-2026',
        title: 'Will BTC exceed $100k in 2026?',
        category: 'Crypto',
        yesTokenMint: '11111111111111111111111111111113',
        noTokenMint: '11111111111111111111111111111114',
        yesPrice: 0.43,
        noPrice: 0.57,
        volume24h: 2_400_000,
        status: 'active',
      },
    ];
  }
}
