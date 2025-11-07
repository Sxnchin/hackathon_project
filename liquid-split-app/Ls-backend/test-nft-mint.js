/**
 * Quick test script to create a lazy mint voucher
 * Run: node test-nft-mint.js
 */

const testReceipt = {
  id: 1,
  merchantName: "Starbucks",
  amount: 15.50,
  currency: "USD",
  purchaseDate: new Date(),
  potId: 1,
  imageUrl: "https://via.placeholder.com/500?text=Starbucks+Receipt"
};

const recipientAddress = "0xa32146B9D024C063BB4cDC06C25A08addeEB5ae9"; // Your wallet

console.log("🎯 Testing NFT Creation...\n");
console.log("Receipt Data:", JSON.stringify(testReceipt, null, 2));
console.log("\nRecipient:", recipientAddress);

fetch('http://localhost:4000/api/nft/test-voucher', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    receiptData: testReceipt,
    recipientAddress: recipientAddress
  })
})
.then(res => res.json())
.then(data => {
  console.log("\n✅ NFT Voucher Created!");
  console.log("\n📋 Voucher Details:");
  console.log(JSON.stringify(data, null, 2));
  console.log("\n🎉 Success! Your NFT is ready to claim!");
  console.log("\nIPFS Metadata:", data.ipfsUrl);
  console.log("Token ID:", data.voucher.tokenId);
  console.log("\n💡 To claim on-chain, call POST /api/nft/claim with this voucher");
})
.catch(err => {
  console.error("\n❌ Error:", err.message);
  console.log("\nMake sure:");
  console.log("1. Server is running on port 4000");
  console.log("2. NFT_CONTRACT_ADDRESS is set in .env");
  console.log("3. Contract is deployed");
});
