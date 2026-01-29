#!/usr/bin/env ts-node

import { StacksTestnet } from '@stacks/network';
import { MultiTokenUtils, createMultiTokenSuite } from './multi-token-utils';

// Demo configuration
const DEMO_PRIVATE_KEY = process.env.DEMO_PRIVATE_KEY || 'your-demo-private-key';
const DEMO_CONTRACT_ADDRESS = process.env.DEMO_CONTRACT_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

async function runMultiTokenDemo() {
  console.log('🚀 Multi-Token Contract Demo');
  console.log('=' .repeat(50));

  const config = {
    network: new StacksTestnet(),
    contractAddress: DEMO_CONTRACT_ADDRESS,
    senderKey: DEMO_PRIVATE_KEY
  };

  const utils = new MultiTokenUtils(config);

  try {
    // 1. Get contract statistics
    console.log('\n📊 Getting contract statistics...');
    const stats = await utils.getContractStats();
    console.log('Contract Stats:', JSON.stringify(stats, null, 2));

    // 2. Check token balances
    console.log('\n💰 Checking token balances...');
    for (let tokenId = 1; tokenId <= 5; tokenId++) {
      const balance = await utils.getBalance(DEMO_CONTRACT_ADDRESS, tokenId);
      const totalSupply = await utils.getTotalSupply(tokenId);
      const uri = await utils.getTokenUri(tokenId);
      
      console.log(`Token ${tokenId}:`);
      console.log(`  Balance: ${balance}`);
      console.log(`  Total Supply: ${totalSupply}`);
      console.log(`  URI: ${uri}`);
    }

    // 3. Demo marketplace listings
    console.log('\n🏪 Checking marketplace listings...');
    for (let listingId = 1; listingId <= 3; listingId++) {
      try {
        const listing = await utils.getListing(listingId);
        if (listing) {
          console.log(`Listing ${listingId}:`, listing);
        }
      } catch (error) {
        console.log(`Listing ${listingId}: Not found`);
      }
    }

    // 4. Demo staking pools
    console.log('\n🏦 Checking staking pools...');
    for (let poolId = 1; poolId <= 3; poolId++) {
      try {
        const poolInfo = await utils.getPoolInfo(poolId);
        if (poolInfo) {
          console.log(`Pool ${poolId}:`, poolInfo);
          
          // Check pending rewards for demo address
          const pendingRewards = await utils.calculatePendingRewards(DEMO_CONTRACT_ADDRESS, poolId);
          console.log(`  Pending Rewards: ${pendingRewards}`);
        }
      } catch (error) {
        console.log(`Pool ${poolId}: Not found`);
      }
    }

    // 5. Demo governance proposals
    console.log('\n🗳️  Checking governance proposals...');
    for (let proposalId = 1; proposalId <= 3; proposalId++) {
      try {
        const proposal = await utils.getProposal(proposalId);
        if (proposal) {
          console.log(`Proposal ${proposalId}:`, proposal);
        }
      } catch (error) {
        console.log(`Proposal ${proposalId}: Not found`);
      }
    }

    // 6. Demo auctions
    console.log('\n🔨 Checking auctions...');
    for (let auctionId = 1; auctionId <= 3; auctionId++) {
      try {
        const auction = await utils.getAuction(auctionId);
        if (auction) {
          console.log(`Auction ${auctionId}:`, auction);
        }
      } catch (error) {
        console.log(`Auction ${auctionId}: Not found`);
      }
    }

    // 7. Demo bridge transfers
    console.log('\n🌉 Checking bridge transfers...');
    for (let transferId = 1; transferId <= 3; transferId++) {
      try {
        const transfer = await utils.getBridgeTransfer(transferId);
        if (transfer) {
          console.log(`Transfer ${transferId}:`, transfer);
        }
      } catch (error) {
        console.log(`Transfer ${transferId}: Not found`);
      }
    }

    console.log('\n✅ Demo completed successfully!');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

async function runInteractiveDemo() {
  console.log('\n🎮 Interactive Multi-Token Demo');
  console.log('=' .repeat(50));

  const config = {
    network: new StacksTestnet(),
    contractAddress: DEMO_CONTRACT_ADDRESS,
    senderKey: DEMO_PRIVATE_KEY
  };

  const utils = new MultiTokenUtils(config);

  // Simulate user interactions
  const demoScenarios = [
    {
      name: 'Token Minting',
      action: async () => {
        console.log('🎨 Minting demo tokens...');
        const mintTx = await utils.mintTokens(DEMO_CONTRACT_ADDRESS, 0, 1000);
        console.log('Mint transaction created:', mintTx.txid);
        return mintTx;
      }
    },
    {
      name: 'Marketplace Listing',
      action: async () => {
        console.log('🏪 Creating marketplace listing...');
        const listingTx = await utils.createListing(
          `${DEMO_CONTRACT_ADDRESS}.erc1155`,
          1, // token-id
          100, // amount
          1000000, // price (1 STX)
          1440 // duration (1 day)
        );
        console.log('Listing transaction created:', listingTx.txid);
        return listingTx;
      }
    },
    {
      name: 'Staking Pool Creation',
      action: async () => {
        console.log('🏦 Creating staking pool...');
        const poolTx = await utils.createStakingPool(
          `${DEMO_CONTRACT_ADDRESS}.erc1155`,
          1, // token-id
          50, // reward rate
          10, // min stake
          500 // max stake
        );
        console.log('Pool transaction created:', poolTx.txid);
        return poolTx;
      }
    },
    {
      name: 'Governance Proposal',
      action: async () => {
        console.log('🗳️  Creating governance proposal...');
        const proposalTx = await utils.createProposal(
          'Demo Proposal',
          'This is a demonstration governance proposal for testing purposes.',
          1440 // voting duration
        );
        console.log('Proposal transaction created:', proposalTx.txid);
        return proposalTx;
      }
    },
    {
      name: 'Token Auction',
      action: async () => {
        console.log('🔨 Creating token auction...');
        const auctionTx = await utils.createAuction(
          `${DEMO_CONTRACT_ADDRESS}.erc1155`,
          1, // token-id
          50, // amount
          500000, // starting price (0.5 STX)
          1000000, // reserve price (1 STX)
          1440 // duration
        );
        console.log('Auction transaction created:', auctionTx.txid);
        return auctionTx;
      }
    }
  ];

  for (const scenario of demoScenarios) {
    try {
      console.log(`\n▶️  Running: ${scenario.name}`);
      await scenario.action();
      console.log(`✅ ${scenario.name} completed`);
      
      // Wait between scenarios
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ ${scenario.name} failed:`, error.message);
    }
  }

  console.log('\n🎉 Interactive demo completed!');
}

async function runBenchmarkDemo() {
  console.log('\n⚡ Multi-Token Performance Benchmark');
  console.log('=' .repeat(50));

  const config = {
    network: new StacksTestnet(),
    contractAddress: DEMO_CONTRACT_ADDRESS,
    senderKey: DEMO_PRIVATE_KEY
  };

  const utils = new MultiTokenUtils(config);

  const benchmarks = [
    {
      name: 'Single Token Transfer',
      iterations: 10,
      action: async () => {
        return utils.transferSingle(
          DEMO_CONTRACT_ADDRESS,
          DEMO_CONTRACT_ADDRESS,
          1,
          1
        );
      }
    },
    {
      name: 'Batch Token Transfer',
      iterations: 5,
      action: async () => {
        return utils.transferBatch(
          DEMO_CONTRACT_ADDRESS,
          DEMO_CONTRACT_ADDRESS,
          [1, 2, 3],
          [10, 20, 30]
        );
      }
    },
    {
      name: 'Balance Query',
      iterations: 50,
      action: async () => {
        return utils.getBalance(DEMO_CONTRACT_ADDRESS, 1);
      }
    },
    {
      name: 'Marketplace Listing Creation',
      iterations: 5,
      action: async () => {
        return utils.createListing(
          `${DEMO_CONTRACT_ADDRESS}.erc1155`,
          1,
          10,
          1000000,
          1440
        );
      }
    }
  ];

  for (const benchmark of benchmarks) {
    console.log(`\n🏃 Running: ${benchmark.name} (${benchmark.iterations} iterations)`);
    
    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < benchmark.iterations; i++) {
      try {
        await benchmark.action();
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    const avgTime = duration / benchmark.iterations;

    console.log(`  ✅ Success: ${successCount}/${benchmark.iterations}`);
    console.log(`  ❌ Errors: ${errorCount}/${benchmark.iterations}`);
    console.log(`  ⏱️  Average time: ${avgTime.toFixed(2)}ms`);
    console.log(`  📊 Total time: ${duration}ms`);
  }

  console.log('\n📈 Benchmark completed!');
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'basic';

  console.log(`Running demo in ${mode} mode...`);

  switch (mode) {
    case 'basic':
      await runMultiTokenDemo();
      break;
    case 'interactive':
      await runInteractiveDemo();
      break;
    case 'benchmark':
      await runBenchmarkDemo();
      break;
    case 'all':
      await runMultiTokenDemo();
      await runInteractiveDemo();
      await runBenchmarkDemo();
      break;
    default:
      console.log('Available modes: basic, interactive, benchmark, all');
      console.log('Usage: npm run utils:demo [mode]');
      break;
  }
}

// Handle command line execution
if (require.main === module) {
  main().catch(console.error);
}

export { runMultiTokenDemo, runInteractiveDemo, runBenchmarkDemo };