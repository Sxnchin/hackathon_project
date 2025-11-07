/**
 * Production-Ready NFT Service for LiquidSplit
 * Implements lazy minting with signature verification for ultra-low gas costs
 * Only mints on-chain when user actually claims the NFT
 */

import { ethers } from 'ethers';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProductionNFTService {
  constructor() {
    this.contractAddress = process.env.NFT_CONTRACT_ADDRESS;
    this.privateKey = process.env.PRIVATE_KEY;
    this.rpcUrl = process.env.POLYGON_AMOY_RPC || process.env.POLYGON_ZKEVM_RPC || 'https://rpc-amoy.polygon.technology';
    this.pinataApiKey = process.env.PINATA_API_KEY;
    this.pinataSecretKey = process.env.PINATA_SECRET_KEY;
    this.chainId = parseInt(process.env.CHAIN_ID || '80002'); // Polygon Amoy testnet
    
    // Initialize provider and wallet
    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    this.wallet = new ethers.Wallet(this.privateKey, this.provider);
    
    // Load contract ABI
    this.loadContractABI();
    
    // EIP-712 Domain for signature
    this.domain = {
      name: 'LiquidSplit Receipt NFT',
      version: '1',
      chainId: this.chainId,
      verifyingContract: this.contractAddress,
    };
    
    this.types = {
      NFTVoucher: [
        { name: 'tokenId', type: 'uint256' },
        { name: 'uri', type: 'string' },
        { name: 'recipient', type: 'address' },
        { name: 'receiptId', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
      ],
    };
  }

  loadContractABI() {
    try {
      const artifactPath = path.join(__dirname, '../../artifacts/contracts/LiquidSplitNFT.sol/LiquidSplitNFT.json');
      if (fs.existsSync(artifactPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        this.contractABI = artifact.abi;
        this.contract = new ethers.Contract(this.contractAddress, this.contractABI, this.wallet);
      } else {
        console.warn('Contract ABI not found. Run "npm run compile" first.');
      }
    } catch (error) {
      console.error('Error loading contract ABI:', error);
    }
  }

  /**
   * Generate unique token ID
   */
  generateTokenId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `${timestamp}${random}`;
  }

  /**
   * Generate unique nonce for signature
   */
  generateNonce() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create ERC-721 compliant metadata
   */
  createNFTMetadata(receiptData) {
    return {
      name: `LiquidSplit Receipt #${receiptData.id}`,
      description: `Receipt NFT for ${receiptData.merchantName} purchase`,
      image: receiptData.imageUrl || 'https://via.placeholder.com/500?text=LiquidSplit+Receipt',
      external_url: `https://liquidsplit.app/receipts/${receiptData.id}`,
      attributes: [
        {
          trait_type: 'Merchant',
          value: receiptData.merchantName,
        },
        {
          trait_type: 'Amount',
          value: receiptData.amount,
          display_type: 'number',
        },
        {
          trait_type: 'Currency',
          value: receiptData.currency || 'USD',
        },
        {
          trait_type: 'Purchase Date',
          value: new Date(receiptData.purchaseDate).toISOString(),
          display_type: 'date',
        },
        {
          trait_type: 'Pot ID',
          value: receiptData.potId,
        },
        {
          trait_type: 'Receipt ID',
          value: receiptData.id,
        },
      ],
      properties: {
        receiptId: receiptData.id,
        potId: receiptData.potId,
        merchantName: receiptData.merchantName,
        amount: receiptData.amount,
        purchaseDate: receiptData.purchaseDate,
      },
    };
  }

  /**
   * Upload metadata to IPFS via Pinata
   */
  async uploadToIPFS(metadata) {
    try {
      const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          pinata_api_key: this.pinataApiKey,
          pinata_secret_api_key: this.pinataSecretKey,
        },
        body: JSON.stringify({
          pinataContent: metadata,
          pinataMetadata: {
            name: `receipt-${metadata.properties.receiptId}-metadata.json`,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Pinata upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        ipfsHash: data.IpfsHash,
        url: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
      };
    } catch (error) {
      console.error('IPFS upload error:', error);
      throw error;
    }
  }

  /**
   * Create lazy mint voucher (off-chain signature)
   * This allows users to claim NFTs later with minimal gas
   */
  async createLazyMintVoucher(receiptData, recipientAddress) {
    try {
      // Generate metadata and upload to IPFS
      const metadata = this.createNFTMetadata(receiptData);
      const ipfsData = await this.uploadToIPFS(metadata);

      // Generate unique token ID and nonce
      const tokenId = this.generateTokenId();
      const nonce = Date.now(); // Using timestamp as nonce for uniqueness

      // Create voucher
      const voucher = {
        tokenId,
        uri: ipfsData.url,
        recipient: recipientAddress,
        receiptId: receiptData.id,
        nonce,
      };

      // Sign voucher with EIP-712
      const signature = await this.wallet.signTypedData(
        this.domain,
        this.types,
        voucher
      );

      return {
        voucher: {
          ...voucher,
          signature,
        },
        metadata,
        ipfsHash: ipfsData.ipfsHash,
        ipfsUrl: ipfsData.url,
      };
    } catch (error) {
      console.error('Error creating lazy mint voucher:', error);
      throw error;
    }
  }

  /**
   * Claim NFT on-chain using voucher (user-initiated)
   * This is when actual gas is paid - only when user wants the NFT
   */
  async claimNFT(voucher) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized. Deploy contract first.');
      }

      const tx = await this.contract.lazyMint(voucher);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        tokenId: voucher.tokenId,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      console.error('Error claiming NFT:', error);
      throw error;
    }
  }

  /**
   * Batch mint NFTs on-chain (for admin use)
   */
  async batchMint(receipts, recipientAddress) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized. Deploy contract first.');
      }

      // Upload all metadata to IPFS first
      const uris = [];
      const receiptIds = [];
      const ipfsHashes = [];

      for (const receipt of receipts) {
        const metadata = this.createNFTMetadata(receipt);
        const ipfsData = await this.uploadToIPFS(metadata);
        uris.push(ipfsData.url);
        receiptIds.push(receipt.id);
        ipfsHashes.push(ipfsData.ipfsHash);
      }

      // Batch mint on-chain
      const tx = await this.contract.batchMint(recipientAddress, uris, receiptIds);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        count: receipts.length,
        ipfsHashes,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      console.error('Error batch minting:', error);
      throw error;
    }
  }

  /**
   * Get NFT data from contract
   */
  async getNFTData(tokenId) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized.');
      }

      const owner = await this.contract.ownerOf(tokenId);
      const tokenURI = await this.contract.tokenURI(tokenId);
      const receiptId = await this.contract.getReceiptId(tokenId);

      return {
        tokenId,
        owner,
        tokenURI,
        receiptId: receiptId.toString(),
      };
    } catch (error) {
      console.error('Error getting NFT data:', error);
      return null;
    }
  }

  /**
   * Check if contract is deployed and accessible
   */
  async healthCheck() {
    try {
      if (!this.contract) {
        return {
          status: 'error',
          message: 'Contract not initialized',
          contractAddress: this.contractAddress,
        };
      }

      const name = await this.contract.name();
      const symbol = await this.contract.symbol();
      const nextTokenId = await this.contract.getNextTokenId();

      return {
        status: 'healthy',
        contract: {
          address: this.contractAddress,
          name,
          symbol,
          nextTokenId: nextTokenId.toString(),
        },
        network: {
          rpcUrl: this.rpcUrl,
          chainId: this.chainId,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        contractAddress: this.contractAddress,
      };
    }
  }
}

export default ProductionNFTService;
