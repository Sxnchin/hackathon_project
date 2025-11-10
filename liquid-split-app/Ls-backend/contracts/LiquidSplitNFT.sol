// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title LiquidSplitNFT
 * @notice Production-grade NFT contract for LiquidSplit receipt system
 * @dev Implements lazy minting with signature verification for ultra-low gas costs
 * 
 * Key Features:
 * - Lazy Minting: NFTs are "pre-minted" off-chain and claimed on-chain only when needed
 * - Batch Operations: Mint multiple NFTs in a single transaction
 * - Role-Based Access: MINTER_ROLE for authorized minters, ADMIN_ROLE for contract management
 * - Security: ReentrancyGuard, Pausable, signature verification
 * - Gas Optimized: Efficient storage patterns and batch operations
 */
contract LiquidSplitNFT is 
    ERC721, 
    ERC721URIStorage, 
    ERC721Burnable,
    AccessControl, 
    ReentrancyGuard,
    Pausable,
    EIP712
{
    using ECDSA for bytes32;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    // EIP-712 type hash for lazy minting vouchers
    bytes32 private constant VOUCHER_TYPEHASH = keccak256(
        "NFTVoucher(uint256 tokenId,string uri,address recipient,uint256 receiptId,uint256 nonce)"
    );

    // Contract state
    uint256 private _nextTokenId;
    mapping(uint256 => bool) private _mintedTokens;
    mapping(uint256 => bool) private _usedNonces; // Prevent replay attacks
    mapping(uint256 => uint256) public tokenIdToReceiptId; // Track receipt associations
    
    // Events
    event NFTLazyMinted(
        uint256 indexed tokenId, 
        address indexed recipient, 
        uint256 indexed receiptId,
        string tokenURI
    );
    event BatchMinted(uint256 startTokenId, uint256 count, address indexed recipient);
    event ContractPaused(address indexed admin);
    event ContractUnpaused(address indexed admin);

    /**
     * @notice Initialize the contract
     * @param _name Token name
     * @param _symbol Token symbol
     */
    constructor(
        string memory _name,
        string memory _symbol
    ) ERC721(_name, _symbol) EIP712(_name, "1") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _nextTokenId = 1;
    }

    /**
     * @notice Struct for lazy minting vouchers
     * @dev Created off-chain and verified on-chain during claim
     */
    struct NFTVoucher {
        uint256 tokenId;
        string uri;
        address recipient;
        uint256 receiptId;
        uint256 nonce;
        bytes signature;
    }

    /**
     * @notice Lazy mint NFT using signature verification
     * @dev User claims pre-signed voucher, minting only when needed (ultra-low cost)
     * @param voucher The signed voucher containing NFT data
     * @return tokenId The minted token ID
     */
    function lazyMint(NFTVoucher calldata voucher) 
        external 
        nonReentrant 
        whenNotPaused 
        returns (uint256) 
    {
        require(!_mintedTokens[voucher.tokenId], "Token already minted");
        require(!_usedNonces[voucher.nonce], "Nonce already used");
        require(voucher.recipient != address(0), "Invalid recipient");
        
        // Verify signature
        address signer = _verify(voucher);
        require(hasRole(MINTER_ROLE, signer), "Invalid signature: not from authorized minter");
        
        // Mark nonce as used (prevent replay attacks)
        _usedNonces[voucher.nonce] = true;
        _mintedTokens[voucher.tokenId] = true;
        
        // Mint NFT
        _safeMint(voucher.recipient, voucher.tokenId);
        _setTokenURI(voucher.tokenId, voucher.uri);
        tokenIdToReceiptId[voucher.tokenId] = voucher.receiptId;
        
        emit NFTLazyMinted(voucher.tokenId, voucher.recipient, voucher.receiptId, voucher.uri);
        
        return voucher.tokenId;
    }

    /**
     * @notice Batch mint NFTs for gas efficiency
     * @dev Only callable by MINTER_ROLE
     * @param recipient Address to receive NFTs
     * @param uris Array of token URIs
     * @param receiptIds Array of receipt IDs
     */
    function batchMint(
        address recipient,
        string[] calldata uris,
        uint256[] calldata receiptIds
    ) external onlyRole(MINTER_ROLE) nonReentrant whenNotPaused {
        require(recipient != address(0), "Invalid recipient");
        require(uris.length == receiptIds.length, "Array length mismatch");
        require(uris.length > 0 && uris.length <= 100, "Invalid batch size"); // Max 100 per batch
        
        uint256 startTokenId = _nextTokenId;
        
        for (uint256 i = 0; i < uris.length; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(recipient, tokenId);
            _setTokenURI(tokenId, uris[i]);
            tokenIdToReceiptId[tokenId] = receiptIds[i];
            _mintedTokens[tokenId] = true;
        }
        
        emit BatchMinted(startTokenId, uris.length, recipient);
    }

    /**
     * @notice Standard mint function (fallback)
     * @param to Recipient address
     * @param uri Token URI
     * @param receiptId Associated receipt ID
     */
    function mint(address to, string memory uri, uint256 receiptId) 
        external 
        onlyRole(MINTER_ROLE) 
        nonReentrant 
        whenNotPaused 
        returns (uint256) 
    {
        require(to != address(0), "Invalid recipient");
        
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        tokenIdToReceiptId[tokenId] = receiptId;
        _mintedTokens[tokenId] = true;
        
        emit NFTLazyMinted(tokenId, to, receiptId, uri);
        
        return tokenId;
    }

    /**
     * @notice Verify voucher signature
     * @dev Internal function to validate EIP-712 signatures
     */
    function _verify(NFTVoucher calldata voucher) internal view returns (address) {
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
            VOUCHER_TYPEHASH,
            voucher.tokenId,
            keccak256(bytes(voucher.uri)),
            voucher.recipient,
            voucher.receiptId,
            voucher.nonce
        )));
        
        return digest.recover(voucher.signature);
    }

    /**
     * @notice Get next available token ID
     */
    function getNextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }

    /**
     * @notice Check if token has been minted
     */
    function isMinted(uint256 tokenId) external view returns (bool) {
        return _mintedTokens[tokenId];
    }

    /**
     * @notice Check if nonce has been used
     */
    function isNonceUsed(uint256 nonce) external view returns (bool) {
        return _usedNonces[nonce];
    }

    /**
     * @notice Get receipt ID for a token
     */
    function getReceiptId(uint256 tokenId) external view returns (uint256) {
        require(_mintedTokens[tokenId], "Token not minted");
        return tokenIdToReceiptId[tokenId];
    }

    // Admin functions

    /**
     * @notice Pause contract (emergency stop)
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
        emit ContractPaused(msg.sender);
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
        emit ContractUnpaused(msg.sender);
    }

    // Required overrides
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
