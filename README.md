# x402 Facilitator Server

A production-ready facilitator server for the x402 payment protocol, supporting 25+ EVM chains and Solana.

## What is x402?

x402 is an open payment protocol that enables digital payments on the internet with:
- **No fees** - Facilitator covers transaction costs
- **2-second settlement** - Fast blockchain confirmation
- **$0.001 minimum** - Micro-payments enabled
- **Multi-chain** - 25+ EVM chains + Solana support

## Quick Start

1. **Clone and install:**
```bash
git clone https://github.com/coinbase/x402.git
cd x402
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your private keys
```

3. **Start server:**
```bash
npm start
```

The facilitator server will start on `http://localhost:3000`

## Supported Networks

### EVM Networks (25)
- **Ethereum**: Mainnet, Sepolia, Goerli
- **Base**: Mainnet, Sepolia  
- **Arbitrum**: Mainnet, Sepolia, Goerli
- **Optimism**: Mainnet, Sepolia, Goerli
- **Polygon**: Mainnet, Amoy, Mumbai
- **BSC**: Mainnet, Testnet
- **Avalanche**: Mainnet, Fuji
- **IoTeX, Sei, zkSync, Linea, Celo, Gnosis, Fantom**

### SVM Networks (2)
- **Solana**: Mainnet, Devnet

## API Endpoints

### Health Check
```bash
GET /health
```
Returns server status.

### Verify Payment
```bash
POST /verify
```
Verifies payment payloads across all supported networks.

**Request:**
```json
{
  "paymentPayload": {
    "x402Version": 1,
    "network": "arbitrum",
    "payload": { ... }
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

### Settle Payment
```bash
POST /settle
```
Settles payments by signing and broadcasting transactions.

### Supported Networks
```bash
GET /supported
```
Returns all supported payment configurations.

## Environment Variables

```env
# Required: At least one private key
EVM_PRIVATE_KEY=0x...  # For EVM networks
SVM_PRIVATE_KEY=...    # For Solana networks

# Optional
PORT=3000              # Server port
NODE_ENV=production    # Environment
```

## Development

```bash
# Install dependencies
npm install

# Start in development
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Deployment

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Setup
1. Set `EVM_PRIVATE_KEY` for EVM networks
2. Set `SVM_PRIVATE_KEY` for Solana networks  
3. Configure `PORT` and `NODE_ENV`
4. Deploy with your preferred platform

## Architecture

The facilitator server provides:

- **Payment Verification** - Validates payment payloads
- **Payment Settlement** - Signs and broadcasts transactions
- **Multi-chain Support** - Automatic network detection
- **Production Ready** - Error handling, logging, monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

Apache-2.0 License - see [LICENSE](LICENSE) file for details.