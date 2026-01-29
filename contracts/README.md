# Multi-Token Contracts

A comprehensive suite of smart contracts for multi-token functionality on Stacks blockchain, featuring ERC1155-compatible tokens with advanced DeFi capabilities.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run tests
npm test

# Deploy to testnet
npm run deploy:testnet

# Run demo
npm run utils:demo
```

## 📋 Contracts Overview

| Contract | Description | Features |
|----------|-------------|----------|
| **erc1155.clar** | Core multi-token contract | Multi-token support, batch operations, metadata |
| **multi-token-factory.clar** | Contract deployment factory | Deploy & manage contracts |
| **token-marketplace.clar** | Trading marketplace | Listings, purchases, fees |
| **multi-token-staking.clar** | Staking system | Pools, rewards, claiming |
| **token-bridge.clar** | Cross-chain bridge | Multi-chain transfers |
| **token-governance.clar** | DAO governance | Proposals, voting, execution |
| **token-auction.clar** | Auction system | Bidding, settlements, reserves |

## 🔧 Development

### Prerequisites
- Node.js 18+
- Clarinet CLI
- Stacks wallet with testnet STX

### Setup
```bash
# Clone and install
git clone <repository>
cd contracts
npm install

# Check contracts
npm run check:contracts

# Format contracts
npm run format:contracts
```

### Testing
```bash
# Run all tests
npm test

# Run specific test suite
npm run test:multi-token

# Watch mode
npm run test:watch

# Coverage report
npm run test:report
```

### Deployment
```bash
# Deploy to testnet
PRIVATE_KEY=your-key npm run deploy:testnet

# Deploy to mainnet
PRIVATE_KEY=your-key npm run deploy:mainnet
```

## 📖 Usage Examples

### Basic Token Operations

```typescript
import { MultiTokenUtils } from './scripts/multi-token-utils';

const utils = new MultiTokenUtils({
  network: new StacksTestnet(),
  contractAddress: 'ST1234...ABC',
  senderKey: 'your-private-key'
});

// Mint tokens
await utils.mintTokens('recipient-address', 0, 1000);

// Transfer tokens
await utils.transferSingle('from', 'to', 1, 100);

// Batch transfer
await utils.transferBatch('from', 'to', [1, 2], [50, 75]);
```

### Marketplace Operations

```typescript
// Create listing
await utils.createListing(
  'token-contract',
  1, // token-id
  100, // amount
  1000000, // price (1 STX)
  1440 // duration (1 day)
);

// Purchase tokens
await utils.purchaseTokens(1, 50); // listing-id, amount
```

### Staking Operations

```typescript
// Create staking pool
await utils.createStakingPool(
  'token-contract',
  1, // token-id
  100, // reward rate
  10, // min stake
  1000 // max stake
);

// Stake tokens
await utils.stakeTokens(1, 200); // pool-id, amount

// Claim rewards
await utils.claimRewards(1);
```

## 🧪 Testing

### Test Structure
```
tests/
├── multi-token-suite.test.ts    # Comprehensive test suite
└── test-helper.ts               # Test utilities
```

### Test Categories
- ✅ ERC1155 core functionality
- ✅ Factory contract operations
- ✅ Marketplace trading
- ✅ Staking mechanics
- ✅ Governance voting
- ✅ Auction bidding
- ✅ Bridge transfers
- ✅ Integration scenarios

### Running Tests
```bash
# All tests
npm test

# Specific test file
npm run test:multi-token

# With coverage
npm run test:report

# Watch mode
npm run test:watch
```

## 🔐 Security

### Access Controls
- Owner-only functions for critical operations
- Operator approval system for delegated transfers
- Role-based permissions across contracts

### Safety Mechanisms
- Input validation on all functions
- Overflow/underflow protection
- Reentrancy guards where applicable
- Emergency pause functionality

### Audit Points
- State consistency checks
- Atomic operations for critical functions
- Comprehensive event logging
- Clear error handling and reporting

## 📊 Gas Estimates

| Operation | Estimated Gas | Notes |
|-----------|---------------|-------|
| Mint tokens | 5,000 | Single token type |
| Transfer single | 3,000 | Basic transfer |
| Transfer batch | 8,000 | Multiple tokens |
| Create listing | 8,000 | Marketplace |
| Stake tokens | 8,000 | Staking pool |
| Create proposal | 10,000 | Governance |
| Place bid | 12,000 | Auction |
| Bridge transfer | 15,000 | Cross-chain |

## 🌐 Network Configuration

### Testnet
- **Network**: Stacks Testnet
- **Explorer**: https://explorer.stacks.co/?chain=testnet
- **API**: https://stacks-node-api.testnet.stacks.co

### Mainnet
- **Network**: Stacks Mainnet
- **Explorer**: https://explorer.stacks.co
- **API**: https://stacks-node-api.mainnet.stacks.co

## 📚 Documentation

### Contract Documentation
- [ERC1155 Contract](./contracts/erc1155.clar) - Core multi-token functionality
- [Factory Contract](./contracts/multi-token-factory.clar) - Contract deployment
- [Marketplace Contract](./contracts/token-marketplace.clar) - Token trading
- [Staking Contract](./contracts/multi-token-staking.clar) - Reward staking
- [Bridge Contract](./contracts/token-bridge.clar) - Cross-chain transfers
- [Governance Contract](./contracts/token-governance.clar) - DAO voting
- [Auction Contract](./contracts/token-auction.clar) - Auction trading

### Utility Documentation
- [Deployment Script](./scripts/deploy-multi-token-suite.ts) - Automated deployment
- [Utility Library](./scripts/multi-token-utils.ts) - Contract interactions
- [Demo Script](./scripts/multi-token-demo.ts) - Usage examples

## 🛠️ Scripts

### Available Scripts
```bash
# Testing
npm test                    # Run all tests
npm run test:multi-token   # Run multi-token tests
npm run test:watch         # Watch mode
npm run test:report        # Coverage report

# Deployment
npm run deploy:testnet     # Deploy to testnet
npm run deploy:mainnet     # Deploy to mainnet

# Utilities
npm run utils:demo         # Run demo script
npm run check:contracts    # Check contract syntax
npm run format:contracts   # Format contracts
npm run analyze:contracts  # Analyze contracts
```

### Demo Modes
```bash
# Basic demo
npm run utils:demo basic

# Interactive demo
npm run utils:demo interactive

# Performance benchmark
npm run utils:demo benchmark

# All demos
npm run utils:demo all
```

## 🔄 Integration

### Frontend Integration
```typescript
import { MultiTokenUtils } from '@bittask/multi-token-contracts';

const multiToken = new MultiTokenUtils(config);

// Get user balances
const balance = await multiToken.getBalance(userAddress, tokenId);

// Create marketplace listing
const tx = await multiToken.createListing(
  tokenContract, tokenId, amount, price, duration
);
```

### Event Monitoring
```typescript
// Monitor transfer events
const events = await multiToken.getContractEvents();
events.filter(e => e.event === 'transfer-single')
      .forEach(processTransfer);
```

## 🚧 Roadmap

### Phase 1 ✅
- Core ERC1155 implementation
- Factory and marketplace contracts
- Staking and governance systems
- Auction and bridge functionality

### Phase 2 🔄
- Advanced governance features
- Cross-chain bridge expansion
- NFT marketplace enhancements
- Yield farming mechanisms

### Phase 3 📋
- Layer 2 scaling solutions
- Advanced DeFi integrations
- Mobile SDK development
- Enterprise features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Development Guidelines
- Follow existing code style
- Add comprehensive tests
- Update documentation
- Use meaningful commit messages

## 📄 License

MIT License - see [LICENSE](../LICENSE) file for details.

## 🆘 Support

- **Issues**: GitHub Issues for bug reports
- **Discussions**: GitHub Discussions for questions
- **Documentation**: [Full Documentation](../MULTI_TOKEN_IMPLEMENTATION.md)

---

**Built with ❤️ for the Stacks ecosystem**