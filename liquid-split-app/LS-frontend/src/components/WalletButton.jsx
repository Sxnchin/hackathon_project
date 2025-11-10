/**
 * Wallet Connect Button Component
 * Allows users to connect/disconnect their MetaMask wallet
 */

import { useWeb3 } from '../utils/web3Context';
import './WalletButton.css';

export default function WalletButton() {
  const {
    account,
    isConnected,
    isConnecting,
    isCorrectNetwork,
    error,
    connectWallet,
    disconnectWallet,
    switchToPolygonAmoy,
    isMetaMaskInstalled,
  } = useWeb3();

  // Format address for display
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Handle MetaMask not installed
  if (!isMetaMaskInstalled) {
    return (
      <button
        className="wallet-button install"
        onClick={() => window.open('https://metamask.io/download/', '_blank')}
      >
        📦 Install MetaMask
      </button>
    );
  }

  // Handle connecting state
  if (isConnecting) {
    return (
      <button className="wallet-button connecting" disabled>
        <span className="spinner"></span>
        Connecting...
      </button>
    );
  }

  // Handle connected state
  if (isConnected) {
    return (
      <div className="wallet-connected">
        {!isCorrectNetwork && (
          <button
            className="wallet-button wrong-network"
            onClick={switchToPolygonAmoy}
          >
            ⚠️ Switch to Polygon Amoy
          </button>
        )}
        <button className="wallet-button connected" onClick={disconnectWallet}>
          <span className="wallet-indicator">🟢</span>
          {formatAddress(account)}
        </button>
      </div>
    );
  }

  // Handle disconnected state
  return (
    <div className="wallet-container">
      <button className="wallet-button" onClick={connectWallet}>
        🦊 Connect Wallet
      </button>
      {error && <div className="wallet-error">{error}</div>}
    </div>
  );
}
