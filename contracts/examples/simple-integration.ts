#!/usr/bin/env ts-node

/**
 * Simple Multi-Token Integration Example
 * 
 * This example demonstrates how to integrate the multi-token contracts
 * into a simple application for token management and trading.
 */

import { StacksTestnet } from '@stacks/network';
import { MultiTokenUtils } from '../scripts/multi-token-utils';

// Configuration
const NETWORK = new StacksTestnet();
const CONTRACT_ADDRESS = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const PRIVATE_KEY = process.env.PRIVATE_KEY || 'demo-private-key';

class SimpleTokenApp {
  private utils: MultiTokenUtils;
  private userAddress: string;

  constructor(contractAddress: string, privateKey: string) {
    this.utils = new MultiTokenUtils({
      network: NETWORK,
      contractAddress,
      senderKey: privateKey
    });
    this.userAddress = contractAddress; // Simplified for demo
  }

  /**
   * Initialize the app with sample tokens
   */
  async initialize() {
    console.log('🚀 Initializing Simple Token App...');
    
    try {
      // Create sample tokens
      const tokens = [
        { name: 'GameCoin', supply: 10000, uri: 'https://api.game.com/gamecoin.json' },
        { name: 'RewardToken', supply: 5000, uri: 'https://api.game.com/reward.json' },
        { name: 'RareNFT', supply: 1, uri: 'https://api.game.com/rare-nft.json' }
      ];

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        console.log(`Creating ${token.name}...`);
        
        // Mint tokens
        const mintTx = await this.utils.mintTokens(this.userAddress, 0, token.supply);
        console.log(`✅ ${token.name} minted (TX: ${mintTx.txid})`);
        
        // Set metadata
        const uriTx = await this.utils.setTokenUri(i + 1, token.uri);
        console.log(`✅ ${token.name} metadata set (TX: ${uriTx.txid})`);
      }

      console.log('🎉 App initialized successfully!');
    } catch (error) {
      console.error('❌ Initialization failed:', error);
    }
  }

  /**
   * Get user's token portfolio
   */
  async getPortfolio() {
    console.log('\n💼 User Portfolio:');
    
    const portfolio = [];
    
    for (let tokenId = 1; tokenId <= 5; tokenId++) {
      try {
        const balance = await this.utils.getBalance(this.userAddress, tokenId);
        const totalSupply = await this.utils.getTotalSupply(tokenId);
        const uri = await this.utils.getTokenUri(tokenId);
        
        if (balance > 0) {
          portfolio.push({
            tokenId,
            balance,
            totalSupply,
            uri,
            percentage: ((balance / totalSupply) * 100).toFixed(2)
          });
        }
      } catch (error) {
        // Token doesn't exist, skip
      }
    }

    portfolio.forEach(token => {
      console.log(`  Token ${token.tokenId}:`);
      console.log(`    Balance: ${token.balance}`);
      console.log(`    Total Supply: ${token.totalSupply}`);
      console.log(`    Ownership: ${token.percentage}%`);
      console.log(`    Metadata: ${token.uri}`);
    });

    return portfolio;
  }

  /**
   * Create a marketplace listing
   */
  async createListing(tokenId: number, amount: number, pricePerToken: number) {
    console.log(`\n🏪 Creating marketplace listing for Token ${tokenId}...`);
    
    try {
      const listingTx = await this.utils.createListing(
        `${this.userAddress}.erc1155`,
        tokenId,
        amount,
        pricePerToken,
        1440 // 1 day duration
      );
      
      console.log(`✅ Listing created (TX: ${listingTx.txid})`);
      console.log(`   Token ID: ${tokenId}`);
      console.log(`   Amount: ${amount}`);
      console.log(`   Price: ${pricePerToken / 1000000} STX per token`);
      
      return listingTx;
    } catch (error) {
      console.error('❌ Failed to create listing:', error);
    }
  }

  /**
   * Create a staking pool
   */
  async createStakingPool(tokenId: number, rewardRate: number) {
    console.log(`\n🏦 Creating staking pool for Token ${tokenId}...`);
    
    try {
      const poolTx = await this.utils.createStakingPool(
        `${this.userAddress}.erc1155`,
        tokenId,
        rewardRate,
        10, // min stake
        1000 // max stake
      );
      
      console.log(`✅ Staking pool created (TX: ${poolTx.txid})`);
      console.log(`   Token ID: ${tokenId}`);
      console.log(`   Reward Rate: ${rewardRate} per block`);
      
      return poolTx;
    } catch (error) {
      console.error('❌ Failed to create staking pool:', error);
    }
  }

  /**
   * Stake tokens in a pool
   */
  async stakeTokens(poolId: number, amount: number) {
    console.log(`\n💰 Staking ${amount} tokens in pool ${poolId}...`);
    
    try {
      const stakeTx = await this.utils.stakeTokens(poolId, amount);
      
      console.log(`✅ Tokens staked (TX: ${stakeTx.txid})`);
      console.log(`   Pool ID: ${poolId}`);
      console.log(`   Amount: ${amount}`);
      
      return stakeTx;
    } catch (error) {
      console.error('❌ Failed to stake tokens:', error);
    }
  }

  /**
   * Transfer tokens to another user
   */
  async transferTokens(to: string, tokenId: number, amount: number) {
    console.log(`\n📤 Transferring ${amount} of Token ${tokenId} to ${to}...`);
    
    try {
      const transferTx = await this.utils.transferSingle(
        this.userAddress,
        to,
        tokenId,
        amount
      );
      
      console.log(`✅ Transfer completed (TX: ${transferTx.txid})`);
      
      return transferTx;
    } catch (error) {
      console.error('❌ Failed to transfer tokens:', error);
    }
  }

  /**
   * Create a governance proposal
   */
  async createProposal(title: string, description: string) {
    console.log(`\n🗳️  Creating governance proposal: ${title}...`);
    
    try {
      const proposalTx = await this.utils.createProposal(
        title,
        description,
        1440 // 1 day voting period
      );
      
      console.log(`✅ Proposal created (TX: ${proposalTx.txid})`);
      console.log(`   Title: ${title}`);
      console.log(`   Voting Duration: 1 day`);
      
      return proposalTx;
    } catch (error) {
      console.error('❌ Failed to create proposal:', error);
    }
  }

  /**
   * Create an auction
   */
  async createAuction(tokenId: number, amount: number, startingPrice: number, reservePrice: number) {
    console.log(`\n🔨 Creating auction for Token ${tokenId}...`);
    
    try {
      const auctionTx = await this.utils.createAuction(
        `${this.userAddress}.erc1155`,
        tokenId,
        amount,
        startingPrice,
        reservePrice,
        1440 // 1 day duration
      );
      
      console.log(`✅ Auction created (TX: ${auctionTx.txid})`);
      console.log(`   Token ID: ${tokenId}`);
      console.log(`   Amount: ${amount}`);
      console.log(`   Starting Price: ${startingPrice / 1000000} STX`);
      console.log(`   Reserve Price: ${reservePrice / 1000000} STX`);
      
      return auctionTx;
    } catch (error) {
      console.error('❌ Failed to create auction:', error);
    }
  }

  /**
   * Get contract statistics
   */
  async getStats() {
    console.log('\n📊 Contract Statistics:');
    
    try {
      const stats = await this.utils.getContractStats();
      
      Object.entries(stats).forEach(([contract, data]) => {
        console.log(`  ${contract}:`, JSON.stringify(data, null, 4));
      });
      
      return stats;
    } catch (error) {
      console.error('❌ Failed to get stats:', error);
    }
  }
}

/**
 * Demo application workflow
 */
async function runDemo() {
  console.log('🎮 Simple Multi-Token Integration Demo');
  console.log('=' .repeat(50));

  const app = new SimpleTokenApp(CONTRACT_ADDRESS, PRIVATE_KEY);

  try {
    // 1. Initialize app with sample tokens
    await app.initialize();
    
    // Wait for transactions to process
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 2. Show user portfolio
    await app.getPortfolio();

    // 3. Create marketplace listing
    await app.createListing(1, 100, 1000000); // Token 1, 100 tokens, 1 STX each

    // 4. Create staking pool
    await app.createStakingPool(2, 50); // Token 2, 50 rewards per block

    // 5. Stake some tokens
    await app.stakeTokens(1, 200); // Pool 1, 200 tokens

    // 6. Create governance proposal
    await app.createProposal(
      'Increase Staking Rewards',
      'Proposal to increase staking rewards by 25% to incentivize more participation.'
    );

    // 7. Create auction
    await app.createAuction(3, 1, 500000, 1000000); // Token 3 (NFT), 1 token, 0.5-1 STX

    // 8. Show final statistics
    await app.getStats();

    console.log('\n🎉 Demo completed successfully!');
    console.log('\nNext steps:');
    console.log('  1. Check transactions on Stacks Explorer');
    console.log('  2. Interact with marketplace listings');
    console.log('  3. Participate in governance voting');
    console.log('  4. Bid on auctions');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Export for use in other modules
export { SimpleTokenApp };

// Run demo if called directly
if (require.main === module) {
  runDemo().catch(console.error);
}