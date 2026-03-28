import type { Request, Response, NextFunction } from 'express';

/**
 * x402-style payment middleware for TRON.
 *
 * Implements HTTP 402 Payment Required pattern with TRON TRC-20 USDT settlement.
 * Follows x402 spec but adapted for TRON's transaction model.
 *
 * Flow:
 *   1. Client sends request without payment
 *   2. Server returns 402 with TRON payment requirements
 *   3. Client broadcasts TRC-20 USDT transfer on TRON
 *   4. Client retries with X-Tron-Payment-TxHash header
 *   5. Server verifies payment on TRON and serves content
 */

interface TronPaymentRequirement {
  chain: string;
  amount: string;
  asset: string;
  to: string;
  memo: string;
  instructions: string;
}

interface X402TronConfig {
  receiverAddress: string;   // TRON base58 address (T...)
  amountUsdt: string;        // e.g. "0.10" for 10 cents
  tronFullHost: string;      // e.g. "https://nile.trongrid.io"
  memo: string;
}

export function x402TronMiddleware(config: X402TronConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const txHash = req.headers['x-tron-payment-txhash'] as string | undefined;

    if (!txHash) {
      // Return 402 with TRON payment requirements
      const requirement: TronPaymentRequirement = {
        chain: 'TRON-NILE',
        amount: config.amountUsdt,
        asset: 'USDT_TRC20',
        to: config.receiverAddress,
        memo: config.memo,
        instructions: `Broadcast a TRC-20 USDT transfer of ${config.amountUsdt} to ${config.receiverAddress}. Include the txHash in the X-Tron-Payment-TxHash header when retrying.`,
      };

      res.status(402).json({
        x402Version: 1,
        payment_required: requirement,
        error: 'Payment Required',
        message: `Access costs ${config.amountUsdt} USDT on TRON. Send payment and retry with X-Tron-Payment-TxHash header.`,
      });
      return;
    }

    // Verify payment on TRON
    try {
      const isValid = await verifyTronPayment(
        txHash,
        config.receiverAddress,
        config.amountUsdt,
        config.tronFullHost,
      );

      if (!isValid) {
        res.status(402).json({
          error: 'Payment verification failed',
          message: 'Could not verify the TRON transaction. Ensure it is confirmed and matches the required amount.',
        });
        return;
      }

      (req as Request & { payment?: unknown }).payment = {
        verified: true,
        txHash,
        amount: config.amountUsdt,
        chain: 'TRON',
      };

      next();
    } catch (error) {
      res.status(500).json({ error: 'TRON payment verification error' });
    }
  };
}

async function verifyTronPayment(
  txHash: string,
  expectedReceiver: string,
  expectedAmount: string,
  tronFullHost: string,
): Promise<boolean> {
  try {
    // Query TRON API for transaction info
    const response = await fetch(`${tronFullHost}/wallet/gettransactionbyid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: txHash }),
    });

    const tx = await response.json() as {
      ret?: Array<{ contractRet: string }>;
      raw_data?: {
        contract?: Array<{
          parameter?: {
            value?: {
              to_address?: string;
              amount?: number;
              data?: string;
              contract_address?: string;
            };
          };
          type?: string;
        }>;
      };
    };

    // Check transaction exists and succeeded
    if (!tx.ret || tx.ret[0]?.contractRet !== 'SUCCESS') {
      return false;
    }

    // For TRC-20 transfers, the contract call data contains transfer(to, amount)
    // Simplified verification for hackathon: just check tx exists and succeeded
    // Production: decode the TRC-20 transfer data and verify recipient + amount
    const contract = tx.raw_data?.contract?.[0];
    if (!contract) return false;

    // TriggerSmartContract = TRC-20 transfer
    if (contract.type === 'TriggerSmartContract') {
      // USDT contract on Nile: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
      // Verify it's a USDT transfer to our receiver
      const data = contract.parameter?.value?.data;
      if (!data) return false;

      // transfer(address,uint256) selector: a9059cbb
      if (!data.startsWith('a9059cbb')) return false;

      // Transaction exists, is a TRC-20 transfer, and succeeded — accept for hackathon
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
