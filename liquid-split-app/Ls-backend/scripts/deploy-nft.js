import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Deploy LiquidSplitNFT contract to Polygon zkEVM
 * Ultra-low gas costs make this ideal for production
 */
async function main() {
  console.log("🚀 Deploying LiquidSplitNFT contract...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Deploy contract
  console.log("📝 Deploying contract...");
  const LiquidSplitNFT = await hre.ethers.getContractFactory("LiquidSplitNFT");
  const nft = await LiquidSplitNFT.deploy(
    "LiquidSplit Receipt NFT",
    "LSRCT"
  );

  await nft.waitForDeployment();
  const contractAddress = await nft.getAddress();

  console.log("✅ LiquidSplitNFT deployed to:", contractAddress);
  console.log("🔗 Network:", hre.network.name);
  console.log("⛽ Gas used for deployment will be minimal on zkEVM\n");

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: contractAddress,
    deployerAddress: deployer.address,
    deployedAt: new Date().toISOString(),
    contractName: "LiquidSplitNFT",
    symbol: "LSRCT",
    blockNumber: await hre.ethers.provider.getBlockNumber(),
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentPath = path.join(
    deploymentsDir,
    `${hre.network.name}-deployment.json`
  );
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("💾 Deployment info saved to:", deploymentPath);

  // Update .env file
  console.log("\n📋 Add this to your .env file:");
  console.log(`NFT_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`NFT_CONTRACT_NETWORK=${hre.network.name}`);

  // Verification instructions
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n🔍 To verify the contract, run:");
    console.log(`npx hardhat verify --network ${hre.network.name} ${contractAddress} "LiquidSplit Receipt NFT" "LSRCT"`);
  }

  console.log("\n✨ Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
