# 📚 API Documentation

## Base URL
```
Development: http://localhost:4000
Production: https://your-domain.com
```

---

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### Token Expiration
- **Access Token**: 15 minutes
- **Refresh Token**: 7 days

---

## Authentication Endpoints

### 1. Register User

Create a new user account.

**Endpoint**: `POST /api/auth/register`

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "walletAddress": "0x742d35Cc6443f5C74A5F6e9b8e8f1F1F4545D5A5"  // Optional
}
```

**Validation Rules**:
- `name`: 2-100 characters
- `email`: Valid email format
- `password`: Min 8 chars, must include uppercase, lowercase, number, special char
- `walletAddress`: Valid Ethereum address (0x + 40 hex chars)

**Response** (201 Created):
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "walletAddress": "0x742d35Cc6443f5C74A5F6e9b8e8f1F1F4545D5A5",
      "role": "USER",
      "createdAt": "2024-11-07T12:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses**:
- `400`: User already exists, invalid input
- `429`: Too many registration attempts

---

### 2. Login

Authenticate a user and receive tokens.

**Endpoint**: `POST /api/auth/login`

**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "walletAddress": "0x742d35Cc6443f5C74A5F6e9b8e8f1F1F4545D5A5",
      "role": "USER",
      "balance": 0,
      "isActive": true,
      "lastLogin": "2024-11-07T12:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses**:
- `401`: Invalid credentials
- `403`: Account inactive
- `429`: Too many login attempts

---

### 3. Refresh Token

Get a new access token using refresh token.

**Endpoint**: `POST /api/auth/refresh`

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses**:
- `400`: Refresh token required
- `401`: Invalid or expired refresh token
- `403`: Account inactive

---

### 4. Logout

Invalidate the user's refresh token.

**Endpoint**: `POST /api/auth/logout`

**Headers**: `Authorization: Bearer <access_token>`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 5. Get Current User

Get authenticated user's profile.

**Endpoint**: `GET /api/auth/me`

**Headers**: `Authorization: Bearer <access_token>`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "walletAddress": "0x742d35Cc6443f5C74A5F6e9b8e8f1F1F4545D5A5",
      "role": "USER",
      "balance": 0,
      "isActive": true,
      "emailVerified": false,
      "lastLogin": "2024-11-07T12:00:00.000Z",
      "createdAt": "2024-11-06T10:00:00.000Z",
      "updatedAt": "2024-11-07T12:00:00.000Z"
    }
  }
}
```

---

### 6. Link Wallet

Link an Ethereum wallet to user account.

**Endpoint**: `PATCH /api/auth/wallet`

**Headers**: `Authorization: Bearer <access_token>`

**Request Body**:
```json
{
  "walletAddress": "0x742d35Cc6443f5C74A5F6e9b8e8f1F1F4545D5A5",
  "signature": "0x...",  // Signature of message
  "message": "Link wallet to LiquidSplit account"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Wallet linked successfully",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "walletAddress": "0x742d35Cc6443f5C74A5F6e9b8e8f1F1F4545D5A5",
      "role": "USER"
    }
  }
}
```

**Error Responses**:
- `400`: Invalid signature, wallet already linked
- `401`: Not authenticated

---

## NFT Endpoints

### 1. Create NFT Voucher (Lazy Mint)

Create an off-chain voucher for lazy minting. **No gas cost**.

**Endpoint**: `POST /api/nfts/create-voucher`

**Headers**: `Authorization: Bearer <access_token>`

**Request Body**:
```json
{
  "receiptId": 1,
  "recipientAddress": "0x742d35Cc6443f5C74A5F6e9b8e8f1F1F4545D5A5"  // Optional, uses user's wallet if omitted
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "NFT voucher created successfully (no gas cost yet)",
  "data": {
    "voucher": {
      "tokenId": "1699363200123456",
      "uri": "https://gateway.pinata.cloud/ipfs/QmXxgx8...",
      "recipient": "0x742d35Cc6443f5C74A5F6e9b8e8f1F1F4545D5A5",
      "receiptId": 1,
      "nonce": 1699363200,
      "signature": "0x1234567890abcdef..."
    },
    "metadata": {
      "name": "LiquidSplit Receipt #1",
      "description": "Receipt NFT for Test Merchant purchase",
      "image": "https://via.placeholder.com/500",
      "attributes": [
        {
          "trait_type": "Merchant",
          "value": "Test Merchant"
        },
        {
          "trait_type": "Amount",
          "value": 100.50,
          "display_type": "number"
        },
        {
          "trait_type": "Currency",
          "value": "USD"
        },
        {
          "trait_type": "Purchase Date",
          "value": "2024-11-07T12:00:00.000Z",
          "display_type": "date"
        }
      ]
    },
    "ipfsUrl": "https://gateway.pinata.cloud/ipfs/QmXxgx8...",
    "claimInstructions": "Use /api/nfts/claim endpoint to mint on-chain when ready"
  }
}
```

**Error Responses**:
- `400`: Receipt not found, voucher already exists, no wallet address
- `403`: Not authorized to create voucher for this receipt
- `429`: Too many mint requests

---

### 2. Claim NFT

Claim an NFT on-chain using a voucher. **User pays gas (~$0.0002)**.

**Endpoint**: `POST /api/nfts/claim`

**Headers**: `Authorization: Bearer <access_token>`

**Request Body**:
```json
{
  "receiptId": 1
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "NFT claimed successfully",
  "data": {
    "transactionHash": "0xabc123...",
    "tokenId": "1699363200123456",
    "blockNumber": 12345678,
    "gasUsed": "123456",
    "openseaUrl": "https://testnets.opensea.io/assets/cardona/0x.../1699363200123456",
    "etherscanUrl": "https://cardona-zkevm.polygonscan.com/tx/0xabc123..."
  }
}
```

**Error Responses**:
- `400`: No voucher exists, already claimed
- `404`: Receipt not found
- `429`: Too many claim requests
- `500`: Blockchain error (check logs)

---

### 3. Batch Create Vouchers (Admin Only)

Create vouchers for multiple receipts at once.

**Endpoint**: `POST /api/nfts/batch-create-vouchers`

**Headers**: `Authorization: Bearer <access_token>`

**Required Role**: `ADMIN` or `MODERATOR`

**Request Body**:
```json
{
  "receiptIds": [1, 2, 3, 4, 5],
  "recipientAddress": "0x742d35Cc6443f5C74A5F6e9b8e8f1F1F4545D5A5"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Created 5 vouchers",
  "data": {
    "results": [
      { "receiptId": 1, "tokenId": "1699363200123456" },
      { "receiptId": 2, "tokenId": "1699363200123457" },
      { "receiptId": 3, "tokenId": "1699363200123458" },
      { "receiptId": 4, "tokenId": "1699363200123459" },
      { "receiptId": 5, "tokenId": "1699363200123460" }
    ],
    "errors": []
  }
}
```

**Error Responses**:
- `403`: Insufficient permissions
- `400`: Invalid receipt IDs, invalid array size (max 100)

---

### 4. Get NFT Data for Receipt

Get NFT information for a specific receipt.

**Endpoint**: `GET /api/nfts/receipt/:receiptId`

**Headers**: `Authorization: Bearer <access_token>`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "nft": {
      "id": 1,
      "nftMinted": true,
      "nftClaimable": true,
      "nftClaimed": true,
      "nftTokenId": "1699363200123456",
      "nftTxHash": "0xabc123...",
      "nftContractAddr": "0x742d35Cc6443f5C74A5F6e9b8e8f1F1F4545D5A5",
      "nftIpfsHash": "QmXxgx8...",
      "nftMetadataUrl": "https://gateway.pinata.cloud/ipfs/QmXxgx8...",
      "nftOwner": "0x742d35Cc6443f5C74A5F6e9b8e8f1F1F4545D5A5",
      "nftMintedAt": "2024-11-07T12:30:00.000Z",
      "nftOpenseaUrl": "https://testnets.opensea.io/assets/...",
      "nftEtherscanUrl": "https://cardona-zkevm.polygonscan.com/token/..."
    }
  }
}
```

**Error Responses**:
- `403`: Not authorized to view this receipt
- `404`: Receipt not found

---

### 5. Get My NFTs

Get all NFTs owned by authenticated user.

**Endpoint**: `GET /api/nfts/my-nfts`

**Headers**: `Authorization: Bearer <access_token>`

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "nfts": [
      {
        "id": 1,
        "amount": 100.50,
        "merchantName": "Test Merchant",
        "purchaseDate": "2024-11-07T10:00:00.000Z",
        "nftTokenId": "1699363200123456",
        "nftTxHash": "0xabc123...",
        "nftMetadataUrl": "https://gateway.pinata.cloud/ipfs/...",
        "nftMintedAt": "2024-11-07T12:30:00.000Z",
        "nftOpenseaUrl": "https://testnets.opensea.io/...",
        "nftEtherscanUrl": "https://cardona-zkevm.polygonscan.com/...",
        "pot": {
          "id": 1,
          "name": "Vacation Fund"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

### 6. Get NFT Statistics

Get NFT statistics for authenticated user.

**Endpoint**: `GET /api/nfts/stats`

**Headers**: `Authorization: Bearer <access_token>`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "stats": {
      "total": 10,           // Total receipts
      "minted": 5,           // Already minted on-chain
      "claimable": 3,        // Vouchers created, not yet claimed
      "totalValue": 1250.50  // Total value of all NFTs
    }
  }
}
```

---

### 7. Check Service Health

Check if NFT service is operational.

**Endpoint**: `GET /api/nfts/health`

**No Authentication Required**

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "contract": {
      "address": "0x742d35Cc6443f5C74A5F6e9b8e8f1F1F4545D5A5",
      "name": "LiquidSplit Receipt NFT",
      "symbol": "LSRCT",
      "nextTokenId": "100"
    },
    "network": {
      "rpcUrl": "https://rpc.cardona.zkevm-rpc.com",
      "chainId": 2442
    }
  }
}
```

**Error Response** (503):
```json
{
  "success": false,
  "status": "error",
  "message": "Contract not initialized",
  "contractAddress": "0x742d35Cc6443f5C74A5F6e9b8e8f1F1F4545D5A5"
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Human-readable error description"
}
```

### Common Error Types
- `Bad Request` (400)
- `Unauthorized` (401)
- `Forbidden` (403)
- `Not Found` (404)
- `Too Many Requests` (429)
- `Internal Server Error` (500)

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| Global | 100 requests / 15 minutes |
| `/api/auth/register` | 5 requests / hour |
| `/api/auth/login` | 5 requests / 15 minutes |
| `/api/auth/*` (other) | 10 requests / 15 minutes |
| `/api/nfts/create-voucher` | 50 requests / hour per user |
| `/api/nfts/claim` | 100 requests / hour |

**Rate Limit Response** (429):
```json
{
  "success": false,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later."
}
```

---

## Webhooks (Future Feature)

*Coming soon: Webhook notifications for NFT events*

---

## Pagination

Endpoints that return lists support pagination:

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response Format**:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## Security Considerations

### API Keys
- **Never** include API keys or private keys in requests
- Server handles all blockchain signing

### Authentication
- Access tokens expire after 15 minutes
- Use refresh tokens to get new access tokens
- Store tokens securely (httpOnly cookies recommended for frontend)

### CORS
- Production API only accepts requests from configured frontend domain
- Development allows all origins

### HTTPS
- **Always** use HTTPS in production
- Tokens sent over HTTP can be intercepted

---

## SDK Examples

### JavaScript/TypeScript
```javascript
// Create a client
const api = axios.create({
  baseURL: 'http://localhost:4000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Set token after login
api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

// Create NFT voucher
const response = await api.post('/api/nfts/create-voucher', {
  receiptId: 1,
});

console.log('Voucher created:', response.data);
```

### Python
```python
import requests

# Login
response = requests.post(
    'http://localhost:4000/api/auth/login',
    json={'email': 'user@example.com', 'password': 'password'}
)
access_token = response.json()['data']['accessToken']

# Create voucher
headers = {'Authorization': f'Bearer {access_token}'}
response = requests.post(
    'http://localhost:4000/api/nfts/create-voucher',
    json={'receiptId': 1},
    headers=headers
)
print('Voucher:', response.json())
```

---

## Testing

Use the included Postman collection or test with curl:

```bash
# Health check
curl http://localhost:4000/api/nfts/health

# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"Test123!@#"}'

# Login  
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'
```

---

## Changelog

### v1.0.0 (2024-11-07)
- Initial production release
- JWT authentication system
- Lazy minting implementation
- Batch operations
- Comprehensive security
- Full test coverage
