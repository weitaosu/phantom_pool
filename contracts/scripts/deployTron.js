/**
 * Deploy DarkPoolTron.sol to TRON Nile testnet using TronWeb.
 *
 * Prerequisites:
 * 1. Get TRX from Nile faucet: https://nileex.io/join/getJoinPage
 * 2. Set TRON_PRIVATE_KEY in .env (hex, no 0x prefix)
 *
 * Usage: node contracts/scripts/deployTron.js
 */

const TronWeb = require('tronweb');
const fs = require('fs');
const path = require('path');

async function main() {
  const privateKey = process.env.TRON_PRIVATE_KEY;
  if (!privateKey) {
    console.error('Set TRON_PRIVATE_KEY in .env (hex string, no 0x prefix)');
    process.exit(1);
  }

  const tronWeb = new TronWeb({
    fullHost: 'https://nile.trongrid.io',
    privateKey,
  });

  const address = tronWeb.address.fromPrivateKey(privateKey);
  console.log('Deploying from:', address);

  const balance = await tronWeb.trx.getBalance(address);
  console.log('Balance:', balance / 1_000_000, 'TRX');

  if (balance < 100_000_000) {
    console.error('Insufficient TRX. Get test tokens from https://nileex.io/join/getJoinPage');
    process.exit(1);
  }

  // Compile with Hardhat first, then read artifact
  // For TronIDE deployment, copy DarkPoolTron.sol directly to https://www.tronide.io/
  console.log('\nFor TronIDE deployment:');
  console.log('1. Open https://www.tronide.io/');
  console.log('2. Paste contracts/tron/DarkPoolTron.sol');
  console.log('3. Compile with Solidity ^0.8.20');
  console.log('4. Deploy to Nile testnet');
  console.log('5. Constructor args: USDT address, matching engine address');
  console.log('\nNile USDT (TRC-20):', 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf');
  console.log('Your address (matching engine):', address);
}

main().catch(console.error);
