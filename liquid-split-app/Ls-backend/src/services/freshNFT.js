import crypto from 'crypto';
import axios from 'axios';
import FormData from 'form-data';

/**
 * Fresh NFT Service - Modern, Clean Approach
 * Generates professional NFT metadata and handles IPFS storage
 */
class FreshNFTService {
  constructor() {
    this.baseUrl = 'https://api.pinata.cloud';
    this.apiKey = process.env.PINATA_API_KEY;
    this.secretKey = process.env.PINATA_SECRET_API_KEY;
  }

  /**
   * Generate a unique NFT token ID
   */
  generateTokenId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate a realistic transaction hash
   */
  generateTxHash() {
    return '0x' + crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create professional NFT metadata
   */
  createNFTMetadata(receipt, potName = 'LiquidSplit Pot') {
    const tokenId = this.generateTokenId();
    const metadata = {
      name: `LiquidSplit Receipt #${receipt.id}`,
      description: `Digital ownership receipt for ${potName}. This NFT represents proof of payment and ownership rights for a shared purchase through LiquidSplit.`,
      image: `https://nft.liquidsplit.com/receipt/${receipt.id}/image.png`,
      external_url: `https://liquidsplit.com/receipt/${receipt.id}`,
      
      // Standard NFT attributes
      attributes: [
        {
          trait_type: "Receipt ID",
          value: receipt.id
        },
        {
          trait_type: "Pot Name", 
          value: potName
        },
        {
          trait_type: "Amount Paid",
          value: receipt.amount,
          display_type: "number"
        },
        {
          trait_type: "Payment Date",
          value: new Date(receipt.timestamp).toISOString().split('T')[0]
        },
        {
          trait_type: "Payer",
          value: receipt.payer?.name || 'Unknown'
        },
        {
          trait_type: "Platform",
          value: "LiquidSplit"
        }
      ],

      // LiquidSplit specific data
      liquidsplit_data: {
        receipt_id: receipt.id,
        pot_id: receipt.potId,
        amount: receipt.amount,
        payer_id: receipt.payerId,
        timestamp: receipt.timestamp,
        description: receipt.description
      },

      // Technical metadata
      token_id: tokenId,
      blockchain: "Ethereum",
      standard: "ERC-721",
      created_at: new Date().toISOString()
    };

    return { metadata, tokenId };
  }

  /**
   * Upload NFT metadata to IPFS via Pinata
   */
  async uploadToIPFS(metadata, tokenId) {
    try {
      const formData = new FormData();
      
      // Create JSON file
      const metadataJson = JSON.stringify(metadata, null, 2);
      formData.append('file', Buffer.from(metadataJson), {
        filename: `liquidsplit-nft-${tokenId}.json`,
        contentType: 'application/json'
      });

      // Pinata metadata
      const pinataMetadata = JSON.stringify({
        name: `LiquidSplit NFT ${tokenId}`,
        keyvalues: {
          platform: 'liquidsplit',
          token_id: tokenId,
          receipt_id: metadata.liquidsplit_data.receipt_id.toString(),
          type: 'nft_metadata'
        }
      });
      formData.append('pinataMetadata', pinataMetadata);

      const response = await axios.post(`${this.baseUrl}/pinning/pinFileToIPFS`, formData, {
        headers: {
          ...formData.getHeaders(),
          pinata_api_key: this.apiKey,
          pinata_secret_api_key: this.secretKey
        }
      });

      const ipfsHash = response.data.IpfsHash;
      console.log(`✅ NFT metadata uploaded to IPFS: ${ipfsHash}`);
      
      return {
        ipfsHash,
        metadataUrl: `https://ipfs.io/ipfs/${ipfsHash}`,
        gatewayUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
      };

    } catch (error) {
      console.error('❌ IPFS upload failed:', error.response?.data || error.message);
      throw new Error('Failed to upload NFT metadata to IPFS');
    }
  }

  /**
   * Create a complete NFT for a receipt
   */
  async createNFT(receipt, potName, ownerAddress = null) {
    try {
      console.log(`🎨 Creating NFT for receipt #${receipt.id}...`);

      // Generate metadata
      const { metadata, tokenId } = this.createNFTMetadata(receipt, potName);
      
      // Upload to IPFS
      const ipfsData = await this.uploadToIPFS(metadata, tokenId);
      
      // Generate blockchain data (mock for demo)
      const nftData = {
        tokenId,
        contractAddress: '0x742d35Cc9443f5C74A5F6e9b8e8f1F1F4545D5A5', // Mock contract
        transactionHash: this.generateTxHash(),
        blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
        
        // IPFS data
        ipfsHash: ipfsData.ipfsHash,
        metadataUrl: ipfsData.metadataUrl,
        
        // Ownership
        owner: ownerAddress || '0x0000000000000000000000000000000000000000',
        
        // Status
        minted: true,
        mintedAt: new Date().toISOString(),
        
        // Links
        opensea: `https://opensea.io/assets/ethereum/0x742d35Cc9443f5C74A5F6e9b8e8f1F1F4545D5A5/${tokenId}`,
        etherscan: `https://etherscan.io/tx/${this.generateTxHash()}`,
        
        // Original metadata
        metadata
      };

      console.log(`✅ NFT created successfully! Token ID: ${tokenId}`);
      return nftData;

    } catch (error) {
      console.error('❌ NFT creation failed:', error.message);
      throw error;
    }
  }

  /**
   * Get NFT collection stats
   */
  async getCollectionStats(receipts) {
    const stats = {
      totalNFTs: receipts.filter(r => r.nftMinted).length,
      totalValue: receipts.reduce((sum, r) => sum + (r.nftMinted ? parseFloat(r.amount) : 0), 0),
      totalReceipts: receipts.length,
      percentMinted: receipts.length > 0 ? (receipts.filter(r => r.nftMinted).length / receipts.length * 100).toFixed(1) : 0
    };

    return stats;
  }

  /**
   * Generate receipt image URL (placeholder for now)
   */
  generateReceiptImageUrl(receiptId) {
    // In a real app, this would generate an actual receipt image
    return `https://via.placeholder.com/400x600/667eea/ffffff?text=Receipt+%23${receiptId}`;
  }
}

export default FreshNFTService;