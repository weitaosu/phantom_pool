/**
 * x402 Solana payment middleware.
 *
 * Two modes:
 * 1. If @x402/express is installed, uses the real SDK with official facilitator
 * 2. Otherwise, provides a spec-compliant fallback
 *
 * Real SDK usage (per docs):
 *   import { paymentMiddleware, x402ResourceServer } from "@x402/express";
 *   import { ExactSvmScheme } from "@x402/svm/exact/server";
 *   import { HTTPFacilitatorClient } from "@x402/core/server";
 *
 *   const facilitator = new HTTPFacilitatorClient({ url: "https://x402.org/facilitator" });
 *   const server = new x402ResourceServer(facilitator)
 *     .register("solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1", new ExactSvmScheme());
 *
 *   app.use(paymentMiddleware(routes, server));
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';

interface X402SolanaConfig {
  receiverWallet: string;
  priceUsdc: string;
  network: string;
  description: string;
}

/**
 * Try to load the real @x402/express SDK. If unavailable, return null.
 */
async function tryLoadX402SDK(config: X402SolanaConfig): Promise<RequestHandler | null> {
  try {
    // Dynamic import — only works if packages are installed
    // @ts-ignore — optional dependency
    const { paymentMiddleware, x402ResourceServer } = await import('@x402/express');
    // @ts-ignore — optional dependency
    const { ExactSvmScheme } = await import('@x402/svm/exact/server');
    // @ts-ignore — optional dependency
    const { HTTPFacilitatorClient } = await import('@x402/core/server');

    const facilitator = new HTTPFacilitatorClient({
      url: 'https://x402.org/facilitator',
    });

    const server = new x402ResourceServer(facilitator)
      .register('solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1', new ExactSvmScheme());

    return paymentMiddleware(
      {
        'POST /api/solana/orders/submit': {
          accepts: [{
            scheme: 'exact',
            price: `$${config.priceUsdc}`,
            network: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1', // solana-devnet CAIP-2
            payTo: config.receiverWallet,
          }],
          description: config.description,
          mimeType: 'application/json',
        },
      },
      server,
    );
  } catch {
    return null;
  }
}

/**
 * Fallback middleware that follows the x402 spec manually.
 */
function fallbackMiddleware(config: X402SolanaConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const paymentHeader = req.headers['x-payment'] as string | undefined;

    if (!paymentHeader) {
      // Return 402 per x402 spec
      res.status(402).json({
        x402Version: 1,
        accepts: [{
          scheme: 'exact',
          network: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
          maxAmountRequired: config.priceUsdc,
          asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mint on Solana
          payTo: config.receiverWallet,
        }],
        description: config.description,
      });
      return;
    }

    // Verify payment on Solana (simplified for hackathon)
    try {
      const rpcUrl = config.network.includes('devnet')
        ? 'https://api.devnet.solana.com'
        : 'https://api.mainnet-beta.solana.com';

      const txSig = paymentHeader;
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1,
          method: 'getTransaction',
          params: [txSig, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }],
        }),
      });

      const result = await response.json() as { result: unknown };
      if (!result.result) {
        res.status(402).json({ error: 'Payment not found on-chain' });
        return;
      }

      (req as any).x402Payment = { verified: true, txHash: txSig };
      next();
    } catch {
      res.status(500).json({ error: 'Payment verification error' });
    }
  };
}

export async function createX402SolanaMiddleware(config: X402SolanaConfig): Promise<RequestHandler> {
  const sdkMiddleware = await tryLoadX402SDK(config);
  if (sdkMiddleware) {
    console.log('[x402] Using real @x402/express SDK for Solana');
    return sdkMiddleware;
  }
  console.log('[x402] @x402/express not installed — using fallback middleware');
  return fallbackMiddleware(config);
}

// Synchronous export for backward compatibility
export function x402SolanaMiddleware(config: X402SolanaConfig): RequestHandler {
  return fallbackMiddleware(config);
}
