/**
 * Web3 Wallet Context
 * Manages wallet connection, network switching, and blockchain interactions
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

const Web3Context = createContext();

// Polygon Amoy Testnet Configuration
const POLYGON_AMOY = {
  chainId: '0x13882', // 80002 in hex
  chainName: 'Polygon Amoy Testnet',
  nativeCurrency: {
    name: 'POL',
    symbol: 'POL',
    decimals: 18,
  },
  rpcUrls: ['https://rpc-amoy.polygon.technology'],
  blockExplorerUrls: ['https://amoy.polygonscan.com/'],
};

// NFT Contract Configuration
const NFT_CONTRACT_ADDRESS = import.meta.env.VITE_NFT_CONTRACT_ADDRESS || '0xD9b0d2510f73da0FDc2f00Ec9FCB970e1A355a83';
const TARGET_CHAIN_ID = 80002; // Polygon Amoy

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  };

  // Connect wallet
  const connectWallet = async () => {
    if (!isMetaMaskInstalled()) {
      setError('Please install MetaMask to use this feature');
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      // Create ethers provider
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const web3Signer = await web3Provider.getSigner();
      const network = await web3Provider.getNetwork();

      setAccount(accounts[0]);
      setProvider(web3Provider);
      setSigner(web3Signer);
      setChainId(Number(network.chainId));

      // Check if on correct network
      if (Number(network.chainId) !== TARGET_CHAIN_ID) {
        await switchToPolygonAmoy();
      }

      console.log('✅ Wallet connected:', accounts[0]);
    } catch (err) {
      console.error('Wallet connection error:', err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
    setError(null);
    console.log('👋 Wallet disconnected');
  };

  // Switch to Polygon Amoy network
  const switchToPolygonAmoy = async () => {
    if (!isMetaMaskInstalled()) return;

    try {
      // Try to switch to the network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: POLYGON_AMOY.chainId }],
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [POLYGON_AMOY],
          });
        } catch (addError) {
          setError('Failed to add Polygon Amoy network');
          console.error('Add network error:', addError);
        }
      } else {
        setError('Failed to switch network');
        console.error('Switch network error:', switchError);
      }
    }
  };

  // Listen for account changes
  useEffect(() => {
    if (!isMetaMaskInstalled()) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (accounts[0] !== account) {
        setAccount(accounts[0]);
        console.log('🔄 Account changed to:', accounts[0]);
      }
    };

    const handleChainChanged = (chainIdHex) => {
      const newChainId = parseInt(chainIdHex, 16);
      setChainId(newChainId);
      console.log('🔄 Network changed to:', newChainId);
      
      if (newChainId !== TARGET_CHAIN_ID) {
        setError(`Please switch to Polygon Amoy Testnet (Chain ID: ${TARGET_CHAIN_ID})`);
      } else {
        setError(null);
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [account]);

  // Auto-connect if previously connected
  useEffect(() => {
    const autoConnect = async () => {
      if (!isMetaMaskInstalled()) return;

      try {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts',
        });

        if (accounts.length > 0) {
          await connectWallet();
        }
      } catch (err) {
        console.error('Auto-connect error:', err);
      }
    };

    autoConnect();
  }, []);

  const value = {
    account,
    provider,
    signer,
    chainId,
    isConnecting,
    error,
    isConnected: !!account,
    isCorrectNetwork: chainId === TARGET_CHAIN_ID,
    targetChainId: TARGET_CHAIN_ID,
    nftContractAddress: NFT_CONTRACT_ADDRESS,
    connectWallet,
    disconnectWallet,
    switchToPolygonAmoy,
    isMetaMaskInstalled: isMetaMaskInstalled(),
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within Web3Provider');
  }
  return context;
};
