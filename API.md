# x402 Facilitator API

## Overview

The x402 Facilitator Server provides REST API endpoints for payment verification and settlement across multiple blockchain networks.

## Base URL

```
http://localhost:3000
```

## Authentication

Currently no authentication required. In production, implement API key authentication or similar.

## Endpoints

### Health Check

**GET** `/health`

Returns server health status.

**Response:**
```json
{
  "status": "ok"
}
```

### Verify Payment

**GET** `/verify`

Returns endpoint information.

**Response:**
```json
{
  "endpoint": "/verify",
  "description": "POST to verify x402 payments"
}
```

**POST** `/verify`

Verifies payment payloads across all supported networks.

**Request Body:**
```json
{
  "paymentPayload": {
    "x402Version": 1,
    "network": "arbitrum",
    "payload": {
      "authorization": {
        "from": "0x...",
        "to": "0x...",
        "amount": "1000000",
        "nonce": "0x...",
        "validAfter": 1234567890,
        "validBefore": 1234567890
      },
      "signature": "0x..."
    }
  },
  "paymentRequirements": {
    "x402Version": 1,
    "scheme": "exact",
    "network": "arbitrum",
    "payToAddress": "0x...",
    "price": "$1.00"
  }
}
```

**Response:**
```json
{
  "isValid": true,
  "payer": "0x..."
}
```

### Settle Payment

**GET** `/settle`

Returns endpoint information.

**Response:**
```json
{
  "endpoint": "/settle",
  "description": "POST to settle x402 payments"
}
```

**POST** `/settle`

Settles payments by signing and broadcasting transactions.

**Request Body:** Same as verify endpoint.

**Response:**
```json
{
  "success": true,
  "transaction": "0x123...",
  "network": "arbitrum",
  "payer": "0x..."
}
```

### Supported Networks

**GET** `/supported`

Returns all supported payment configurations.

**Response:**
```json
{
  "kinds": [
    {
      "x402Version": 1,
      "scheme": "exact",
      "network": "ethereum"
    },
    {
      "x402Version": 1,
      "scheme": "exact",
      "network": "arbitrum"
    }
  ]
}
```

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message"
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request
- `500` - Internal Server Error

## Supported Networks

### EVM Networks
- `ethereum` - Ethereum Mainnet
- `sepolia` - Ethereum Sepolia Testnet
- `arbitrum` - Arbitrum Mainnet
- `arbitrum-sepolia` - Arbitrum Sepolia Testnet
- `base` - Base Mainnet
- `base-sepolia` - Base Sepolia Testnet
- `optimism` - Optimism Mainnet
- `polygon` - Polygon Mainnet
- `bsc` - BSC Mainnet
- `avalanche` - Avalanche Mainnet
- And more...

### SVM Networks
- `solana` - Solana Mainnet
- `solana-devnet` - Solana Devnet

## Rate Limits

Currently no rate limits implemented. In production, implement appropriate rate limiting.
