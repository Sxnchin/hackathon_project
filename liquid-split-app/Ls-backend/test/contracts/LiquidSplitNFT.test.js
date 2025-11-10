const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("LiquidSplitNFT", function () {
  // Fixture for deploying the contract
  async function deployNFTFixture() {
    const [owner, minter, user1, user2, unauthorized] = await ethers.getSigners();

    const LiquidSplitNFT = await ethers.getContractFactory("LiquidSplitNFT");
    const nft = await LiquidSplitNFT.deploy("LiquidSplit Receipt NFT", "LSRCT");

    // Grant minter role
    const MINTER_ROLE = await nft.MINTER_ROLE();
    await nft.grantRole(MINTER_ROLE, minter.address);

    return { nft, owner, minter, user1, user2, unauthorized, MINTER_ROLE };
  }

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      const { nft } = await loadFixture(deployNFTFixture);
      expect(await nft.name()).to.equal("LiquidSplit Receipt NFT");
      expect(await nft.symbol()).to.equal("LSRCT");
    });

    it("Should grant DEFAULT_ADMIN_ROLE to deployer", async function () {
      const { nft, owner } = await loadFixture(deployNFTFixture);
      const DEFAULT_ADMIN_ROLE = await nft.DEFAULT_ADMIN_ROLE();
      expect(await nft.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("Should set initial token ID to 1", async function () {
      const { nft } = await loadFixture(deployNFTFixture);
      expect(await nft.getNextTokenId()).to.equal(1);
    });
  });

  describe("Standard Minting", function () {
    it("Should mint NFT with MINTER_ROLE", async function () {
      const { nft, minter, user1 } = await loadFixture(deployNFTFixture);
      
      const uri = "ipfs://QmTest123";
      const receiptId = 1;
      
      await expect(nft.connect(minter).mint(user1.address, uri, receiptId))
        .to.emit(nft, "NFTLazyMinted")
        .withArgs(1, user1.address, receiptId, uri);
      
      expect(await nft.ownerOf(1)).to.equal(user1.address);
      expect(await nft.tokenURI(1)).to.equal(uri);
      expect(await nft.getReceiptId(1)).to.equal(receiptId);
    });

    it("Should reject minting without MINTER_ROLE", async function () {
      const { nft, unauthorized, user1 } = await loadFixture(deployNFTFixture);
      
      await expect(
        nft.connect(unauthorized).mint(user1.address, "ipfs://test", 1)
      ).to.be.reverted;
    });

    it("Should reject minting to zero address", async function () {
      const { nft, minter } = await loadFixture(deployNFTFixture);
      
      await expect(
        nft.connect(minter).mint(ethers.ZeroAddress, "ipfs://test", 1)
      ).to.be.revertedWith("Invalid recipient");
    });

    it("Should increment token IDs correctly", async function () {
      const { nft, minter, user1 } = await loadFixture(deployNFTFixture);
      
      await nft.connect(minter).mint(user1.address, "ipfs://1", 1);
      await nft.connect(minter).mint(user1.address, "ipfs://2", 2);
      await nft.connect(minter).mint(user1.address, "ipfs://3", 3);
      
      expect(await nft.getNextTokenId()).to.equal(4);
      expect(await nft.ownerOf(3)).to.equal(user1.address);
    });
  });

  describe("Batch Minting", function () {
    it("Should batch mint multiple NFTs", async function () {
      const { nft, minter, user1 } = await loadFixture(deployNFTFixture);
      
      const uris = ["ipfs://1", "ipfs://2", "ipfs://3"];
      const receiptIds = [1, 2, 3];
      
      await expect(nft.connect(minter).batchMint(user1.address, uris, receiptIds))
        .to.emit(nft, "BatchMinted")
        .withArgs(1, 3, user1.address);
      
      expect(await nft.ownerOf(1)).to.equal(user1.address);
      expect(await nft.ownerOf(2)).to.equal(user1.address);
      expect(await nft.ownerOf(3)).to.equal(user1.address);
      expect(await nft.getNextTokenId()).to.equal(4);
    });

    it("Should reject batch mint with mismatched arrays", async function () {
      const { nft, minter, user1 } = await loadFixture(deployNFTFixture);
      
      const uris = ["ipfs://1", "ipfs://2"];
      const receiptIds = [1, 2, 3]; // Mismatched length
      
      await expect(
        nft.connect(minter).batchMint(user1.address, uris, receiptIds)
      ).to.be.revertedWith("Array length mismatch");
    });

    it("Should reject batch mint over 100 items", async function () {
      const { nft, minter, user1 } = await loadFixture(deployNFTFixture);
      
      const uris = new Array(101).fill("ipfs://test");
      const receiptIds = new Array(101).fill(1);
      
      await expect(
        nft.connect(minter).batchMint(user1.address, uris, receiptIds)
      ).to.be.revertedWith("Invalid batch size");
    });
  });

  describe("Lazy Minting", function () {
    async function createVoucher(nft, minter, tokenId, uri, recipient, receiptId, nonce) {
      const domain = {
        name: await nft.name(),
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await nft.getAddress(),
      };

      const types = {
        NFTVoucher: [
          { name: "tokenId", type: "uint256" },
          { name: "uri", type: "string" },
          { name: "recipient", type: "address" },
          { name: "receiptId", type: "uint256" },
          { name: "nonce", type: "uint256" },
        ],
      };

      const voucher = {
        tokenId,
        uri,
        recipient,
        receiptId,
        nonce,
      };

      const signature = await minter.signTypedData(domain, types, voucher);
      return { ...voucher, signature };
    }

    it("Should lazy mint with valid signature", async function () {
      const { nft, minter, user1 } = await loadFixture(deployNFTFixture);
      
      const voucher = await createVoucher(
        nft,
        minter,
        100,
        "ipfs://lazy-test",
        user1.address,
        1,
        1
      );
      
      await expect(nft.connect(user1).lazyMint(voucher))
        .to.emit(nft, "NFTLazyMinted")
        .withArgs(100, user1.address, 1, "ipfs://lazy-test");
      
      expect(await nft.ownerOf(100)).to.equal(user1.address);
      expect(await nft.isMinted(100)).to.be.true;
      expect(await nft.isNonceUsed(1)).to.be.true;
    });

    it("Should reject lazy mint with invalid signature", async function () {
      const { nft, user1, unauthorized } = await loadFixture(deployNFTFixture);
      
      const voucher = await createVoucher(
        nft,
        unauthorized, // Not a minter
        100,
        "ipfs://test",
        user1.address,
        1,
        1
      );
      
      await expect(nft.connect(user1).lazyMint(voucher))
        .to.be.revertedWith("Invalid signature: not from authorized minter");
    });

    it("Should reject reusing nonce", async function () {
      const { nft, minter, user1 } = await loadFixture(deployNFTFixture);
      
      const voucher = await createVoucher(nft, minter, 100, "ipfs://1", user1.address, 1, 1);
      await nft.connect(user1).lazyMint(voucher);
      
      const voucher2 = await createVoucher(nft, minter, 101, "ipfs://2", user1.address, 2, 1);
      await expect(nft.connect(user1).lazyMint(voucher2))
        .to.be.revertedWith("Nonce already used");
    });

    it("Should reject minting same token twice", async function () {
      const { nft, minter, user1 } = await loadFixture(deployNFTFixture);
      
      const voucher = await createVoucher(nft, minter, 100, "ipfs://1", user1.address, 1, 1);
      await nft.connect(user1).lazyMint(voucher);
      
      const voucher2 = await createVoucher(nft, minter, 100, "ipfs://2", user1.address, 2, 2);
      await expect(nft.connect(user1).lazyMint(voucher2))
        .to.be.revertedWith("Token already minted");
    });
  });

  describe("Access Control", function () {
    it("Should allow admin to grant MINTER_ROLE", async function () {
      const { nft, owner, user1, MINTER_ROLE } = await loadFixture(deployNFTFixture);
      
      await nft.connect(owner).grantRole(MINTER_ROLE, user1.address);
      expect(await nft.hasRole(MINTER_ROLE, user1.address)).to.be.true;
    });

    it("Should prevent non-admin from granting roles", async function () {
      const { nft, unauthorized, user1, MINTER_ROLE } = await loadFixture(deployNFTFixture);
      
      await expect(
        nft.connect(unauthorized).grantRole(MINTER_ROLE, user1.address)
      ).to.be.reverted;
    });
  });

  describe("Pausable", function () {
    it("Should allow admin to pause contract", async function () {
      const { nft, owner } = await loadFixture(deployNFTFixture);
      
      await expect(nft.connect(owner).pause())
        .to.emit(nft, "ContractPaused")
        .withArgs(owner.address);
    });

    it("Should prevent minting when paused", async function () {
      const { nft, owner, minter, user1 } = await loadFixture(deployNFTFixture);
      
      await nft.connect(owner).pause();
      
      await expect(
        nft.connect(minter).mint(user1.address, "ipfs://test", 1)
      ).to.be.reverted;
    });

    it("Should allow admin to unpause", async function () {
      const { nft, owner } = await loadFixture(deployNFTFixture);
      
      await nft.connect(owner).pause();
      await expect(nft.connect(owner).unpause())
        .to.emit(nft, "ContractUnpaused")
        .withArgs(owner.address);
    });
  });

  describe("Burning", function () {
    it("Should allow owner to burn their NFT", async function () {
      const { nft, minter, user1 } = await loadFixture(deployNFTFixture);
      
      await nft.connect(minter).mint(user1.address, "ipfs://test", 1);
      await nft.connect(user1).burn(1);
      
      await expect(nft.ownerOf(1)).to.be.reverted;
    });

    it("Should prevent non-owner from burning NFT", async function () {
      const { nft, minter, user1, user2 } = await loadFixture(deployNFTFixture);
      
      await nft.connect(minter).mint(user1.address, "ipfs://test", 1);
      
      await expect(nft.connect(user2).burn(1)).to.be.reverted;
    });
  });

  describe("Gas Optimization", function () {
    it("Should use less gas for batch minting vs individual", async function () {
      const { nft, minter, user1 } = await loadFixture(deployNFTFixture);
      
      // Individual mints
      const tx1 = await nft.connect(minter).mint(user1.address, "ipfs://1", 1);
      const receipt1 = await tx1.wait();
      const tx2 = await nft.connect(minter).mint(user1.address, "ipfs://2", 2);
      const receipt2 = await tx2.wait();
      const tx3 = await nft.connect(minter).mint(user1.address, "ipfs://3", 3);
      const receipt3 = await tx3.wait();
      
      const individualGas = receipt1.gasUsed + receipt2.gasUsed + receipt3.gasUsed;
      
      // Batch mint
      const uris = ["ipfs://4", "ipfs://5", "ipfs://6"];
      const receiptIds = [4, 5, 6];
      const batchTx = await nft.connect(minter).batchMint(user1.address, uris, receiptIds);
      const batchReceipt = await batchTx.wait();
      
      console.log("Individual gas:", individualGas.toString());
      console.log("Batch gas:", batchReceipt.gasUsed.toString());
      console.log("Savings:", ((individualGas - batchReceipt.gasUsed) * 100n / individualGas).toString() + "%");
      
      expect(batchReceipt.gasUsed).to.be.lt(individualGas);
    });
  });
});
