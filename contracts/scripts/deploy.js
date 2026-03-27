const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Deploy MockUSDC (testnet only)
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  console.log("MockUSDC deployed to:", await usdc.getAddress());

  // Deploy DarkPoolArbiter
  const DarkPool = await hre.ethers.getContractFactory("DarkPoolArbiter");
  const darkPool = await DarkPool.deploy(await usdc.getAddress(), deployer.address);
  await darkPool.waitForDeployment();
  console.log("DarkPoolArbiter deployed to:", await darkPool.getAddress());

  // Mint test USDC to deployer
  await usdc.mint(deployer.address, 1000000_000000n); // $1M
  console.log("Minted 1,000,000 USDC to deployer");

  console.log("\n--- Copy these to your .env ---");
  console.log(`DARK_POOL_ARBITER_ADDRESS=${await darkPool.getAddress()}`);
  console.log(`MOCK_USDC_ADDRESS=${await usdc.getAddress()}`);
  console.log(`MATCHING_ENGINE_ADDRESS=${deployer.address}`);
}

main().catch(console.error);
