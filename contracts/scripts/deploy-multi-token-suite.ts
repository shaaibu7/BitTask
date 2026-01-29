import { 
  makeContractDeploy,
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  createStacksPrivateKey,
  getAddressFromPrivateKey,
  TransactionVersion
} from '@stacks/transactions';
import { StacksNetwork, StacksTestnet, StacksMainnet } from '@stacks/network';

// Configuration
const NETWORK = process.env.STACKS_NETWORK || 'testnet';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';

if (!PRIVATE_KEY) {
  console.error('Please set PRIVATE_KEY environment variable');
  process.exit(1);
}

const network: StacksNetwork = NETWORK === 'mainnet' 
  ? new StacksMainnet() 
  : new StacksTestnet();

const privateKey = createStacksPrivateKey(PRIVATE_KEY);
const senderAddress = getAddressFromPrivateKey(PRIVATE_KEY, TransactionVersion.Testnet);

console.log(`Deploying to ${NETWORK} network`);
console.log(`Deployer address: ${senderAddress}`);

// Contract deployment order and configurations
const contracts = [
  {
    name: 'erc1155',
    file: 'erc1155.clar',
    description: 'Core ERC1155 multi-token contract'
  },
  {
    name: 'multi-token-factory',
    file: 'multi-token-factory.clar',
    description: 'Factory for deploying multi-token contracts'
  },
  {
    name: 'token-marketplace',
    file: 'token-marketplace.clar',
    description: 'Marketplace for trading tokens'
  },
  {
    name: 'multi-token-staking',
    file: 'multi-token-staking.clar',
    description: 'Staking contract for tokens'
  },
  {
    name: 'token-bridge',
    file: 'token-bridge.clar',
    description: 'Cross-chain bridge for tokens'
  },
  {
    name: 'token-governance',
    file: 'token-governance.clar',
    description: 'Governance system for tokens'
  },
  {
    name: 'token-auction',
    file: 'token-auction.clar',
    description: 'Auction system for tokens'
  }
];

async function deployContract(contractName: string, contractFile: string, description: string) {
  console.log(`\n📦 Deploying ${contractName} (${description})...`);
  
  try {
    // Read contract source
    const fs = require('fs');
    const path = require('path');
    const contractSource = fs.readFileSync(
      path.join(__dirname, '..', 'contracts', contractFile),
      'utf8'
    );

    // Create deployment transaction
    const deployTx = await makeContractDeploy({
      contractName,
      codeBody: contractSource,
      senderKey: privateKey,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee: 10000n, // 0.01 STX
    });

    // Broadcast transaction
    const broadcastResponse = await broadcastTransaction(deployTx, network);
    
    if (broadcastResponse.error) {
      console.error(`❌ Failed to deploy ${contractName}:`, broadcastResponse.error);
      return false;
    }

    console.log(`✅ ${contractName} deployed successfully!`);
    console.log(`   Transaction ID: ${broadcastResponse.txid}`);
    console.log(`   Contract Address: ${senderAddress}.${contractName}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Error deploying ${contractName}:`, error);
    return false;
  }
}

async function initializeContracts() {
  console.log('\n🔧 Initializing contracts...');
  
  try {
    // Initialize bridge with supported chains
    const initBridgeTx = await makeContractCall({
      contractAddress: senderAddress,
      contractName: 'token-bridge',
      functionName: 'initialize-bridge',
      functionArgs: [],
      senderKey: privateKey,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee: 5000n,
    });

    const bridgeResponse = await broadcastTransaction(initBridgeTx, network);
    if (bridgeResponse.error) {
      console.error('❌ Failed to initialize bridge:', bridgeResponse.error);
    } else {
      console.log('✅ Bridge initialized successfully!');
      console.log(`   Transaction ID: ${bridgeResponse.txid}`);
    }

    // Set governance token (using ERC1155 token ID 1)
    const setGovTokenTx = await makeContractCall({
      contractAddress: senderAddress,
      contractName: 'token-governance',
      functionName: 'set-governance-token',
      functionArgs: [
        `${senderAddress}.erc1155`,
        1n
      ],
      senderKey: privateKey,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee: 5000n,
    });

    const govResponse = await broadcastTransaction(setGovTokenTx, network);
    if (govResponse.error) {
      console.error('❌ Failed to set governance token:', govResponse.error);
    } else {
      console.log('✅ Governance token set successfully!');
      console.log(`   Transaction ID: ${govResponse.txid}`);
    }

  } catch (error) {
    console.error('❌ Error initializing contracts:', error);
  }
}

async function createSampleTokens() {
  console.log('\n🎨 Creating sample tokens...');
  
  try {
    // Create sample tokens with metadata
    const tokenTypes = [
      { name: 'Gold Token', supply: 1000n },
      { name: 'Silver Token', supply: 5000n },
      { name: 'Bronze Token', supply: 10000n },
      { name: 'Rare NFT', supply: 1n },
      { name: 'Epic NFT', supply: 1n }
    ];

    for (let i = 0; i < tokenTypes.length; i++) {
      const token = tokenTypes[i];
      
      // Mint tokens
      const mintTx = await makeContractCall({
        contractAddress: senderAddress,
        contractName: 'erc1155',
        functionName: 'mint-tokens',
        functionArgs: [
          senderAddress, // to
          0n, // token-id (0 for new token)
          token.supply // amount
        ],
        senderKey: privateKey,
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
        fee: 5000n,
      });

      const mintResponse = await broadcastTransaction(mintTx, network);
      if (mintResponse.error) {
        console.error(`❌ Failed to mint ${token.name}:`, mintResponse.error);
      } else {
        console.log(`✅ ${token.name} minted successfully!`);
        console.log(`   Token ID: ${i + 1}, Supply: ${token.supply}`);
        console.log(`   Transaction ID: ${mintResponse.txid}`);
      }

      // Set token URI
      const setUriTx = await makeContractCall({
        contractAddress: senderAddress,
        contractName: 'erc1155',
        functionName: 'set-token-uri',
        functionArgs: [
          BigInt(i + 1), // token-id
          `https://api.bittask.com/tokens/${i + 1}/metadata.json` // uri
        ],
        senderKey: privateKey,
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
        fee: 5000n,
      });

      const uriResponse = await broadcastTransaction(setUriTx, network);
      if (uriResponse.error) {
        console.error(`❌ Failed to set URI for ${token.name}:`, uriResponse.error);
      } else {
        console.log(`✅ URI set for ${token.name}`);
      }

      // Wait between transactions
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  } catch (error) {
    console.error('❌ Error creating sample tokens:', error);
  }
}

async function createSampleStakingPool() {
  console.log('\n🏦 Creating sample staking pool...');
  
  try {
    const createPoolTx = await makeContractCall({
      contractAddress: senderAddress,
      contractName: 'multi-token-staking',
      functionName: 'create-staking-pool',
      functionArgs: [
        `${senderAddress}.erc1155`, // token-contract
        1n, // token-id (Gold Token)
        100n, // reward-rate (100 rewards per block per token)
        10n, // min-stake-amount
        1000n // max-stake-amount
      ],
      senderKey: privateKey,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee: 5000n,
    });

    const poolResponse = await broadcastTransaction(createPoolTx, network);
    if (poolResponse.error) {
      console.error('❌ Failed to create staking pool:', poolResponse.error);
    } else {
      console.log('✅ Staking pool created successfully!');
      console.log(`   Pool ID: 1, Token: Gold Token`);
      console.log(`   Transaction ID: ${poolResponse.txid}`);
    }

  } catch (error) {
    console.error('❌ Error creating staking pool:', error);
  }
}

async function deploymentSummary() {
  console.log('\n📋 Deployment Summary');
  console.log('='.repeat(50));
  console.log(`Network: ${NETWORK}`);
  console.log(`Deployer: ${senderAddress}`);
  console.log('\nDeployed Contracts:');
  
  contracts.forEach(contract => {
    console.log(`  ✅ ${contract.name}: ${senderAddress}.${contract.name}`);
  });

  console.log('\nSample Data Created:');
  console.log('  🎨 5 Token types (Gold, Silver, Bronze, Rare NFT, Epic NFT)');
  console.log('  🏦 1 Staking pool for Gold Token');
  console.log('  🔧 Bridge initialized with supported chains');
  console.log('  🗳️  Governance token configured');

  console.log('\nNext Steps:');
  console.log('  1. Verify contracts on Stacks Explorer');
  console.log('  2. Test contract interactions');
  console.log('  3. Set up frontend integration');
  console.log('  4. Configure additional staking pools');
  console.log('  5. Create marketplace listings');
  
  console.log('\n🎉 Multi-Token Suite deployment completed!');
}

async function main() {
  console.log('🚀 Starting Multi-Token Suite Deployment');
  console.log('=' .repeat(50));

  let deploymentSuccess = true;

  // Deploy all contracts
  for (const contract of contracts) {
    const success = await deployContract(contract.name, contract.file, contract.description);
    if (!success) {
      deploymentSuccess = false;
      break;
    }
    
    // Wait between deployments
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  if (!deploymentSuccess) {
    console.log('\n❌ Deployment failed. Please check errors above.');
    process.exit(1);
  }

  // Initialize contracts
  await new Promise(resolve => setTimeout(resolve, 5000));
  await initializeContracts();

  // Create sample data
  await new Promise(resolve => setTimeout(resolve, 5000));
  await createSampleTokens();

  await new Promise(resolve => setTimeout(resolve, 5000));
  await createSampleStakingPool();

  // Show summary
  await deploymentSummary();
}

// Run deployment
main().catch(console.error);