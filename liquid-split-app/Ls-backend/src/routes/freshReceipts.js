import express from "express";
import { PrismaClient } from "@prisma/client";
import FreshNFTService from "../services/freshNFT.js";

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();
const nftService = new FreshNFTService();

/* ================================
   🧾 CREATE RECEIPT FOR POT
================================ */
router.post("/", async (req, res, next) => {
  try {
    const potId = Number(req.params.potId);
    const { payerId, amount, description, autoMintNFT = false, ownerAddress } = req.body;

    if (!Number.isInteger(potId)) {
      return res.status(400).json({ error: "Invalid potId parameter." });
    }
    if (!payerId || amount === undefined) {
      return res.status(400).json({ error: "Missing payerId or amount in request body." });
    }

    const numericPayerId = Number(payerId);
    const numericAmount = Number(amount);
    if (!Number.isInteger(numericPayerId)) {
      return res.status(400).json({ error: "Invalid payerId." });
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0." });
    }

    // Validate pot and payer
    const pot = await prisma.pot.findUnique({ where: { id: potId } });
    if (!pot) return res.status(404).json({ error: "Pot not found." });

    const payer = await prisma.user.findUnique({ where: { id: numericPayerId } });
    if (!payer) return res.status(404).json({ error: "Payer not found." });

    const membership = await prisma.potMember.findFirst({
      where: { potId, userId: numericPayerId },
    });
    if (!membership) {
      return res.status(400).json({ error: "Payer is not a member of this pot." });
    }

    // Create the receipt
    const receipt = await prisma.receipt.create({
      data: {
        potId,
        payerId: numericPayerId,
        amount: numericAmount,
        description: description ? description.toString() : null,
      },
      include: {
        payer: { select: { id: true, name: true, email: true } },
      },
    });

    // Auto-mint NFT if requested
    let nftData = null;
    if (autoMintNFT) {
      try {
        console.log(`🎨 Auto-minting NFT for receipt ${receipt.id}...`);
        nftData = await nftService.createNFT(receipt, pot.name, ownerAddress);
        
        // Update receipt with NFT data
        await prisma.receipt.update({
          where: { id: receipt.id },
          data: {
            nftMinted: true,
            nftTokenId: nftData.tokenId,
            nftTxHash: nftData.transactionHash,
            nftContractAddr: nftData.contractAddress,
            nftIpfsHash: nftData.ipfsHash,
            nftMetadataUrl: nftData.metadataUrl,
            nftOwner: nftData.owner,
            nftMintedAt: new Date(nftData.mintedAt),
            nftOpenseaUrl: nftData.opensea,
            nftEtherscanUrl: nftData.etherscan,
          }
        });
        
        console.log(`✅ NFT auto-minted: Token ID ${nftData.tokenId}`);
      } catch (error) {
        console.error('❌ Auto-mint failed:', error.message);
        nftData = { error: error.message };
      }
    }

    // Get updated receipt
    const updatedReceipt = await prisma.receipt.findUnique({
      where: { id: receipt.id },
      include: {
        payer: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json({ 
      receipt: updatedReceipt,
      nft: nftData
    });
  } catch (error) {
    next(error);
  }
});

/* ================================
   📋 LIST POT RECEIPTS
================================ */
router.get("/", async (req, res, next) => {
  try {
    const potId = Number(req.params.potId);
    if (!Number.isInteger(potId)) {
      return res.status(400).json({ error: "Invalid potId parameter." });
    }

    const pot = await prisma.pot.findUnique({ 
      where: { id: potId },
      select: { id: true, name: true, totalAmount: true }
    });
    if (!pot) return res.status(404).json({ error: "Pot not found." });

    const receipts = await prisma.receipt.findMany({
      where: { potId },
      orderBy: { timestamp: "desc" },
      include: {
        payer: { select: { id: true, name: true, email: true } },
      },
    });

    // Get collection stats
    const stats = await nftService.getCollectionStats(receipts);

    res.json({ 
      pot,
      receipts,
      stats
    });
  } catch (error) {
    next(error);
  }
});

/* ================================
   🎨 MINT NFT FOR RECEIPT
================================ */
router.post("/:receiptId/mint", async (req, res, next) => {
  try {
    const potId = Number(req.params.potId);
    const receiptId = Number(req.params.receiptId);
    const { ownerAddress } = req.body;

    if (!Number.isInteger(potId) || !Number.isInteger(receiptId)) {
      return res.status(400).json({ error: "Invalid potId or receiptId." });
    }

    if (!ownerAddress || !/^0x[a-fA-F0-9]{40}$/.test(ownerAddress)) {
      return res.status(400).json({ error: "Valid Ethereum address required." });
    }

    // Get receipt and pot
    const receipt = await prisma.receipt.findFirst({
      where: { id: receiptId, potId },
      include: {
        payer: { select: { id: true, name: true, email: true } },
        pot: { select: { name: true } }
      },
    });

    if (!receipt) {
      return res.status(404).json({ error: "Receipt not found." });
    }

    if (receipt.nftMinted) {
      return res.status(400).json({ 
        error: "NFT already exists for this receipt.",
        tokenId: receipt.nftTokenId,
        opensea: receipt.nftOpenseaUrl
      });
    }

    // Create NFT
    console.log(`🎨 Minting NFT for receipt ${receiptId}...`);
    const nftData = await nftService.createNFT(receipt, receipt.pot.name, ownerAddress);
    
    // Update receipt with NFT data
    const updatedReceipt = await prisma.receipt.update({
      where: { id: receiptId },
      data: {
        nftMinted: true,
        nftTokenId: nftData.tokenId,
        nftTxHash: nftData.transactionHash,
        nftContractAddr: nftData.contractAddress,
        nftIpfsHash: nftData.ipfsHash,
        nftMetadataUrl: nftData.metadataUrl,
        nftOwner: nftData.owner,
        nftMintedAt: new Date(nftData.mintedAt),
        nftOpenseaUrl: nftData.opensea,
        nftEtherscanUrl: nftData.etherscan,
      },
      include: {
        payer: { select: { id: true, name: true, email: true } },
      },
    });
    
    console.log(`✅ NFT minted successfully: Token ID ${nftData.tokenId}`);
    
    res.status(201).json({ 
      receipt: updatedReceipt,
      nft: nftData
    });
    
  } catch (error) {
    console.error('❌ NFT minting failed:', error.message);
    res.status(500).json({ error: `NFT minting failed: ${error.message}` });
  }
});

/* ================================
   🔍 GET NFT DATA
================================ */
router.get("/:receiptId/nft", async (req, res, next) => {
  try {
    const potId = Number(req.params.potId);
    const receiptId = Number(req.params.receiptId);

    const receipt = await prisma.receipt.findFirst({
      where: { id: receiptId, potId },
      select: {
        id: true,
        nftMinted: true,
        nftTokenId: true,
        nftTxHash: true,
        nftContractAddr: true,
        nftIpfsHash: true,
        nftMetadataUrl: true,
        nftOwner: true,
        nftMintedAt: true,
        nftOpenseaUrl: true,
        nftEtherscanUrl: true,
      }
    });

    if (!receipt) {
      return res.status(404).json({ error: "Receipt not found." });
    }

    if (!receipt.nftMinted) {
      return res.status(404).json({ error: "No NFT exists for this receipt." });
    }

    res.json({
      nft: {
        tokenId: receipt.nftTokenId,
        contractAddress: receipt.nftContractAddr,
        transactionHash: receipt.nftTxHash,
        ipfsHash: receipt.nftIpfsHash,
        metadataUrl: receipt.nftMetadataUrl,
        owner: receipt.nftOwner,
        mintedAt: receipt.nftMintedAt,
        opensea: receipt.nftOpenseaUrl,
        etherscan: receipt.nftEtherscanUrl,
      }
    });
  } catch (error) {
    next(error);
  }
});

/* ================================
   📊 GET COLLECTION STATS
================================ */
router.get("/stats/nft", async (req, res, next) => {
  try {
    const potId = Number(req.params.potId);
    
    const receipts = await prisma.receipt.findMany({
      where: { potId },
      select: {
        nftMinted: true,
        amount: true,
      }
    });

    const stats = await nftService.getCollectionStats(receipts);
    
    res.json({ stats });
  } catch (error) {
    next(error);
  }
});

export default router;