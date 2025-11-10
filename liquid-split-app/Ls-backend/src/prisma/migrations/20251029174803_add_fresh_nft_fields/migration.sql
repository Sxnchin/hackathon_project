-- DropForeignKey
ALTER TABLE "public"."PotMember" DROP CONSTRAINT "PotMember_potId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Receipt" DROP CONSTRAINT "Receipt_potId_fkey";

-- AlterTable
ALTER TABLE "Pot" ADD COLUMN     "creatorId" INTEGER;

-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "nftContractAddr" TEXT,
ADD COLUMN     "nftEtherscanUrl" TEXT,
ADD COLUMN     "nftIpfsHash" TEXT,
ADD COLUMN     "nftMetadataUrl" TEXT,
ADD COLUMN     "nftMinted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nftMintedAt" TIMESTAMP(3),
ADD COLUMN     "nftOpenseaUrl" TEXT,
ADD COLUMN     "nftOwner" TEXT,
ADD COLUMN     "nftTokenId" TEXT,
ADD COLUMN     "nftTxHash" TEXT;

-- AddForeignKey
ALTER TABLE "Pot" ADD CONSTRAINT "Pot_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PotMember" ADD CONSTRAINT "PotMember_potId_fkey" FOREIGN KEY ("potId") REFERENCES "Pot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_potId_fkey" FOREIGN KEY ("potId") REFERENCES "Pot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
