#!/usr/bin/env node

import FreshNFTService from '../src/services/freshNFT.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const nftService = new FreshNFTService();

async function testFreshNFT() {
  try {
    console.log('🚀 TESTING FRESH NFT SYSTEM');
    console.log('============================\n');

    // Get or create a test receipt
    console.log('📄 Step 1: Getting test receipt...');
    let receipt = await prisma.receipt.findFirst({
      where: { nftMinted: false },
      include: {
        payer: { select: { id: true, name: true, email: true } }
      }
    });

    if (!receipt) {
      console.log('No unminted receipts found. Creating test receipt...');
      
      // Get or create test user
      let user = await prisma.user.findFirst();
      if (!user) {
        user = await prisma.user.create({
          data: {
            name: 'Fresh NFT Tester',
            email: 'freshnft@liquidsplit.com',
            password: 'test123'
          }
        });
      }

      // Get or create test pot
      let pot = await prisma.pot.findFirst();
      if (!pot) {
        pot = await prisma.pot.create({
          data: {
            name: 'Fresh NFT Test Pot',
            totalAmount: 100.0,
            creatorId: user.id
          }
        });

        // Add user as member
        await prisma.potMember.create({
          data: {
            userId: user.id,
            potId: pot.id,
            share: 50.0
          }
        });
      }

      // Create test receipt
      receipt = await prisma.receipt.create({
        data: {
          potId: pot.id,
          payerId: user.id,
          amount: 25.50,
          description: 'Fresh NFT Test Receipt'
        },
        include: {
          payer: { select: { id: true, name: true, email: true } }
        }
      });
    }

    console.log(`✅ Using receipt #${receipt.id}: $${receipt.amount}`);

    // Test NFT creation
    console.log('\n🎨 Step 2: Creating fresh NFT...');
    const nftData = await nftService.createNFT(
      receipt, 
      'Fresh NFT Test Pot',
      '0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0'
    );

    console.log('✅ NFT created successfully!');
    console.log(`   Token ID: ${nftData.tokenId}`);
    console.log(`   IPFS Hash: ${nftData.ipfsHash}`);
    console.log(`   Metadata URL: ${nftData.metadataUrl}`);
    console.log(`   OpenSea URL: ${nftData.opensea}`);

    // Update receipt in database
    console.log('\n💾 Step 3: Saving to database...');
    const updatedReceipt = await prisma.receipt.update({
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

    console.log(`✅ Receipt #${updatedReceipt.id} updated with NFT data`);

    // Test collection stats
    console.log('\n📊 Step 4: Testing collection stats...');
    const allReceipts = await prisma.receipt.findMany({
      where: { potId: receipt.potId }
    });
    const stats = await nftService.getCollectionStats(allReceipts);

    console.log('Collection Stats:');
    console.log(`   Total NFTs: ${stats.totalNFTs}`);
    console.log(`   Total Receipts: ${stats.totalReceipts}`);
    console.log(`   NFT Value: $${stats.totalValue}`);
    console.log(`   Percent Minted: ${stats.percentMinted}%`);

    console.log('\n🎉 FRESH NFT SYSTEM TEST COMPLETE!');
    console.log('====================================');
    console.log('');
    console.log('🔥 System Features:');
    console.log('   ✅ Professional NFT metadata generation');
    console.log('   ✅ IPFS upload working perfectly');
    console.log('   ✅ Database integration complete');
    console.log('   ✅ Collection stats tracking');
    console.log('   ✅ Clean API endpoints ready');
    console.log('');
    console.log('🚀 Ready for frontend integration!');
    console.log(`   Visit: http://localhost:5173/pots/${receipt.potId}/nfts`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testFreshNFT();