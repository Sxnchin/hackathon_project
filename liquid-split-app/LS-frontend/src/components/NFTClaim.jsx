/**
 * NFT Claim Component
 * Allows users to claim their lazy-minted NFT vouchers on-chain
 */

import { useState } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../utils/web3Context';
import './NFTClaim.css';

// Contract ABI - only the functions we need
const NFT_ABI = [
  'function lazyMint(tuple(uint256 tokenId, string uri, address recipient, uint256 receiptId, uint256 nonce, bytes signature) voucher) external returns (uint256)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
];

export default function NFTClaim({ voucher, onSuccess, onError }) {
  const { signer, isConnected, isCorrectNetwork, nftContractAddress } = useWeb3();
  const [isClaiming, setIsClaiming] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [claimError, setClaimError] = useState(null);

  const claimNFT = async () => {
    if (!isConnected) {
      setClaimError('Please connect your wallet first');
      return;
    }

    if (!isCorrectNetwork) {
      setClaimError('Please switch to Polygon Amoy network');
      return;
    }

    if (!voucher) {
      setClaimError('No voucher data provided');
      return;
    }

    try {
      setIsClaiming(true);
      setClaimError(null);
      setTxHash(null);

      console.log('🎯 Claiming NFT with voucher:', voucher);

      // Create contract instance
      const contract = new ethers.Contract(nftContractAddress, NFT_ABI, signer);

      // Prepare voucher data for contract
      const voucherData = {
        tokenId: voucher.tokenId,
        uri: voucher.uri,
        recipient: voucher.recipient,
        receiptId: voucher.receiptId,
        nonce: voucher.nonce,
        signature: voucher.signature,
      };

      console.log('📝 Sending transaction...');

      // Call lazyMint function
      const tx = await contract.lazyMint(voucherData);
      
      console.log('⏳ Transaction sent:', tx.hash);
      setTxHash(tx.hash);

      // Wait for confirmation
      console.log('⌛ Waiting for confirmation...');
      const receipt = await tx.wait();

      console.log('✅ NFT claimed successfully!', receipt);

      if (onSuccess) {
        onSuccess({
          txHash: receipt.hash,
          tokenId: voucher.tokenId,
          blockNumber: receipt.blockNumber,
        });
      }

      return receipt;
    } catch (err) {
      console.error('❌ Claim error:', err);
      
      let errorMessage = 'Failed to claim NFT';
      
      if (err.code === 'ACTION_REJECTED') {
        errorMessage = 'Transaction rejected by user';
      } else if (err.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for gas fees';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setClaimError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="nft-claim-container">
      <div className="nft-claim-card">
        {voucher && (
          <div className="nft-preview">
            <h3>NFT Voucher Ready to Claim</h3>
            <div className="voucher-details">
              <p><strong>Token ID:</strong> {voucher.tokenId}</p>
              <p><strong>Recipient:</strong> {voucher.recipient?.slice(0, 6)}...{voucher.recipient?.slice(-4)}</p>
              {voucher.uri && (
                <a href={voucher.uri} target="_blank" rel="noopener noreferrer" className="metadata-link">
                  📋 View Metadata on IPFS
                </a>
              )}
            </div>
          </div>
        )}

        <button
          className={`claim-button ${isClaiming ? 'claiming' : ''}`}
          onClick={claimNFT}
          disabled={isClaiming || !isConnected || !isCorrectNetwork}
        >
          {isClaiming ? (
            <>
              <span className="spinner"></span>
              Claiming NFT...
            </>
          ) : (
            '🎉 Claim NFT On-Chain'
          )}
        </button>

        {!isConnected && (
          <p className="claim-hint">Connect your wallet to claim this NFT</p>
        )}

        {isConnected && !isCorrectNetwork && (
          <p className="claim-error">Please switch to Polygon Amoy network</p>
        )}

        {txHash && (
          <div className="transaction-status">
            <p className="status-pending">⏳ Transaction processing...</p>
            <a
              href={`https://amoy.polygonscan.com/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tx-link"
            >
              View on Polygonscan →
            </a>
          </div>
        )}

        {claimError && (
          <div className="claim-error-box">
            <p>❌ {claimError}</p>
          </div>
        )}

        <div className="gas-estimate">
          <p>💰 Est. Gas Cost: ~$0.0002 (0.001 POL)</p>
          <p className="gas-hint">Claiming writes your NFT to the blockchain</p>
        </div>
      </div>
    </div>
  );
}
