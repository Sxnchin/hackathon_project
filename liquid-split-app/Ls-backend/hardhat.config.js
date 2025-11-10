import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import dotenv from "dotenv";

dotenv.config();

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200, // Optimize for deployment cost vs runtime cost
      },
    },
  },
  networks: {
    // Polygon Amoy Testnet - Where your faucet tokens are!
    polygonAmoy: {
      url: process.env.POLYGON_AMOY_RPC || "https://rpc-amoy.polygon.technology",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80002,
      gasPrice: "auto",
    },
    // Polygon zkEVM Cardona Testnet - ULTRA LOW GAS COSTS
    polygonZkEVMTestnet: {
      url: process.env.POLYGON_ZKEVM_RPC || "https://rpc.cardona.zkevm-rpc.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 2442,
      gasPrice: "auto",
    },
    // Polygon zkEVM Mainnet - for production
    polygonZkEVM: {
      url: process.env.POLYGON_ZKEVM_MAINNET_RPC || "https://zkevm-rpc.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1101,
      gasPrice: "auto",
    },
    // Polygon Mumbai (fallback testnet)
    mumbai: {
      url: process.env.MUMBAI_RPC || "https://rpc-mumbai.maticvigil.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80001,
    },
    // Hardhat local network for testing
    hardhat: {
      chainId: 31337,
    },
  },
  etherscan: {
    apiKey: {
      polygonZkEVMTestnet: process.env.POLYGONSCAN_API_KEY || "",
      polygonZkEVM: process.env.POLYGONSCAN_API_KEY || "",
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "polygonZkEVMTestnet",
        chainId: 2442,
        urls: {
          apiURL: "https://api-cardona-zkevm.polygonscan.com/api",
          browserURL: "https://cardona-zkevm.polygonscan.com"
        }
      },
      {
        network: "polygonZkEVM",
        chainId: 1101,
        urls: {
          apiURL: "https://api-zkevm.polygonscan.com/api",
          browserURL: "https://zkevm.polygonscan.com"
        }
      }
    ]
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  paths: {
    sources: "./contracts",
    tests: "./test/contracts",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
