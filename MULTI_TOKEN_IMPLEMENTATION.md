# Multi-Token Contract Implementation

## Overview

This implementation provides a comprehensive multi-token ecosystem built on Stacks blockchain, featuring ERC1155-compatible contracts with advanced DeFi functionality including marketplace, staking, governance, auctions, and cross-chain bridging.

## Architecture

### Core Contracts

1. **ERC1155 (`erc1155.clar`)** - Main multi-token contract
2. **Multi-Token Factory (`multi-token-factory.clar`)** - Contract deployment factory
3. **Token Marketplace (`token-marketplace.clar`)** - Trading platform
4. **Multi-Token Staking (`multi-token-staking.clar`)** - Staking rewards system
5. **Token Bridge (`token-bridge.clar`)** - Cross-chain transfers
6. **Token Governance (`token-governance.clar`)** - DAO governance system
7. **Token Auction (`token-auction.clar`)** - Auction-based trading

## Features

### ERC1155 Core Features
- ✅ Multi-token support (fungible and non-fungible)
- ✅ Batch operations for gas efficiency
- ✅ Operator approval system
- ✅ Safe transfer functions
- ✅ Metadata URI management
- ✅ Supply tracking and management
- ✅ Event emission for indexing
- ✅ Interface detection (ERC-165 style)

### Advanced Features
- ✅ Token factory for easy deployment
- ✅ Marketplace with fee collection
- ✅ Staking pools with reward distribution
- ✅ Cross-chain bridge functionality
- ✅ Token-based governance system
- ✅ Auction system with reserve prices
- ✅ Comprehensive access controls
- ✅ Emergency pause mechanisms

## Contract Details

### ERC1155 Multi-Token Contract

**Key Functions:**
- `mint-tokens(to, token-id, amount)` - Mint new tokens
- `transfer-single(from, to, token-id, amount)` - Single token transfer
- `transfer-batch(from, to, token-ids, amounts)` - Batch transfer
- `set-approval-for-all(operator, approved)` - Set operator approval
- `burn-tokens(token-id, amount)` - Burn tokens
- `set-token-uri(token-id, uri)` - Set metadata URI

**Read Functions:**
- `get-balance(owner, token-id)` - Get token balance
- `get-total-supply(token-id)` - Get total supply
- `is-approved-for-all(owner, operator)` - Check approval status
- `get-token-uri(token-id)` - Get metadata URI

### Multi-Token Factory

**Purpose:** Deploy and manage multiple ERC1155 contracts

**Key Functions:**
- `deploy-multi-token-contract(name)` - Deploy new contract
- `get-contract-info(contract-id)` - Get contract details
- `get-contracts-by-deployer(deployer)` - Get user's contracts

### Token Marketplace

**Purpose:** Enable trading of multi-tokens with fee collection

**Key Functions:**
- `create-listing(token-contract, token-id, amount, price, duration)` - Create listing
- `purchase-tokens(listing-id, amount)` - Purchase from listing
- `cancel-listing(listing-id)` - Cancel listing

**Features:**
- Configurable marketplace fees
- Listing expiration
- User listing tracking

### Multi-Token Staking

**Purpose:** Stake tokens to earn rewards

**Key Functions:**
- `create-staking-pool(token-contract, token-id, reward-rate, min-stake, max-stake)` - Create pool
- `stake-tokens(pool-id, amount)` - Stake tokens
- `unstake-tokens(pool-id, amount)` - Unstake tokens
- `claim-rewards(pool-id)` - Claim rewards
- `calculate-pending-rewards(user, pool-id)` - Calculate rewards

### Token Bridge

**Purpose:** Enable cross-chain token transfers

**Key Functions:**
- `initiate-transfer(token-contract, token-id, amount, recipient, destination-chain)` - Start transfer
- `process-incoming-transfer(...)` - Process incoming transfer
- `complete-transfer(transfer-id, external-tx-hash)` - Complete transfer

**Supported Chains:**
- Ethereum
- Polygon
- Binance Smart Chain

### Token Governance

**Purpose:** Token-based voting and governance

**Key Functions:**
- `create-proposal(title, description, voting-duration)` - Create proposal
- `vote-on-proposal(proposal-id, vote, tokens)` - Vote on proposal
- `finalize-proposal(proposal-id)` - Finalize voting
- `execute-proposal(proposal-id)` - Execute passed proposal

### Token Auction

**Purpose:** Auction-based token trading

**Key Functions:**
- `create-auction(token-contract, token-id, amount, starting-price, reserve-price, duration)` - Create auction
- `place-bid(auction-id, bid-amount)` - Place bid
- `settle-auction(auction-id)` - Settle completed auction

## Usage Examples

### Basic Token Operations

```typescript
import { MultiTokenUtils } from './scripts/multi-token-utils';

const utils = new MultiTokenUtils({
  network: new StacksTestnet(),
  contractAddress: 'ST1234...ABC',
  senderKey: 'your-private-key'
});

// Mint tokens
await utils.mintTokens('ST1234...RECIPIENT', 0, 1000);

// Transfer tokens
await utils.transferSingle('ST1234...FROM', 'ST1234...TO', 1, 100);

// Set approval
await utils.setApprovalForAll('ST1234...OPERATOR', true);
```

### Marketplace Operations

```typescript
// Create listing
await utils.createListing(
  'ST1234...TOKEN_CONTRACT',
  1, // token-id
  100, // amount
  1000000, // price per token (1 STX)
  1440 // duration (1 day)
);

// Purchase tokens
await utils.purchaseTokens(1, 50); // listing-id, amount
```

### Staking Operations

```typescript
// Create staking pool
await utils.createStakingPool(
  'ST1234...TOKEN_CONTRACT',
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

## Deployment

### Prerequisites
- Node.js 18+
- Stacks CLI
- Private key with STX for deployment

### Deploy All Contracts

```bash
# Set environment variables
export PRIVATE_KEY="your-private-key"
export STACKS_NETWORK="testnet" # or "mainnet"

# Run deployment script
cd contracts
npm run deploy:multi-token
```

### Manual Deployment

```bash
# Deploy individual contracts
clarinet deploy --network testnet

# Or use the deployment script
ts-node scripts/deploy-multi-token-suite.ts
```

## Testing

### Run Tests

```bash
cd contracts
npm test
```

### Test Coverage

The test suite covers:
- ✅ ERC1155 core functionality
- ✅ Factory contract deployment
- ✅ Marketplace operations
- ✅ Staking mechanics
- ✅ Governance voting
- ✅ Auction bidding
- ✅ Integration scenarios

## Security Features

### Access Controls
- Owner-only functions for critical operations
- Operator approval system for delegated transfers
- Role-based permissions across contracts

### Safety Mechanisms
- Input validation on all functions
- Overflow/underflow protection
- Reentrancy guards where applicable
- Emergency pause functionality

### Audit Considerations
- Comprehensive event logging
- State consistency checks
- Atomic operations for critical functions
- Clear error handling and reporting

## Gas Optimization

### Batch Operations
- Batch transfers reduce transaction costs
- Batch queries for multiple data points
- Efficient storage patterns

### Storage Optimization
- Nested maps for efficient lookups
- Minimal storage footprint per token
- Lazy deletion for gas savings

## Integration Guide

### Frontend Integration

```typescript
import { MultiTokenUtils } from '@bittask/multi-token-utils';

// Initialize
const multiToken = new MultiTokenUtils(config);

// Get user balances
const balance = await multiToken.getBalance(userAddress, tokenId);

// Create marketplace listing
const tx = await multiToken.createListing(
  tokenContract, tokenId, amount, price, duration
);
```

### Backend Integration

```typescript
// Monitor events
const events = await multiToken.getContractEvents();

// Process transfers
events.filter(e => e.event === 'transfer-single')
      .forEach(processTransfer);
```

## Roadmap

### Phase 1 (Completed)
- ✅ Core ERC1155 implementation
- ✅ Factory and marketplace contracts
- ✅ Staking and governance systems
- ✅ Auction and bridge functionality

### Phase 2 (Planned)
- 🔄 Advanced governance features
- 🔄 Cross-chain bridge expansion
- 🔄 NFT marketplace enhancements
- 🔄 Yield farming mechanisms

### Phase 3 (Future)
- 📋 Layer 2 scaling solutions
- 📋 Advanced DeFi integrations
- 📋 Mobile SDK development
- 📋 Enterprise features

## Support

### Documentation
- Contract specifications in `/contracts/contracts/`
- Test examples in `/contracts/tests/`
- Deployment guides in `/contracts/scripts/`

### Community
- GitHub Issues for bug reports
- Discord for community support
- Documentation wiki for guides

## License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for the Stacks ecosystem**