import {
  makeContractCall,
  callReadOnlyFunction,
  cvToJSON,
  standardPrincipalCV,
  uintCV,
  boolCV,
  stringAsciiCV,
  listCV,
  someCV,
  noneCV,
  PostConditionMode,
  AnchorMode
} from '@stacks/transactions';
import { StacksNetwork } from '@stacks/network';

export interface MultiTokenConfig {
  network: StacksNetwork;
  contractAddress: string;
  senderKey: string;
}

export class MultiTokenUtils {
  private config: MultiTokenConfig;

  constructor(config: MultiTokenConfig) {
    this.config = config;
  }

  // ERC1155 Core Functions
  async mintTokens(to: string, tokenId: number, amount: number) {
    return makeContractCall({
      contractAddress: this.config.contractAddress,
      contractName: 'erc1155',
      functionName: 'mint-tokens',
      functionArgs: [
        standardPrincipalCV(to),
        uintCV(tokenId),
        uintCV(amount)
      ],
      senderKey: this.config.senderKey,
      network: this.config.network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee: 5000n,
    });
  }

  async transferSingle(from: string, to: string, tokenId: number, amount: number) {
    return makeContractCall({
      contractAddress: this.config.contractAddress,
      contractName: 'erc1155',
      functionName: 'transfer-single',
      functionArgs: [
        standardPrincipalCV(from),
        standardPrincipalCV(to),
        uintCV(tokenId),
        uintCV(amount)
      ],
      senderKey: this.config.senderKey,
      network: this.config.network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee: 5000n,
    });
  }

  async transferBatch(from: string, to: string, tokenIds: number[], amounts: number[]) {
    return makeContractCall({
      contractAddress: this.config.contractAddress,
      contractName: 'erc1155',
      functionName: 'transfer-batch',
      functionArgs: [
        standardPrincipalCV(from),
        standardPrincipalCV(to),
        listCV(tokenIds.map(id => uintCV(id))),
        listCV(amounts.map(amount => uintCV(amount)))
      ],
      senderKey: this.config.senderKey,
      network: this.config.network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee: 8000n,
    });
  }

  async setApprovalForAll(operator: string, approved: boolean) {
    return makeContractCall({
      contractAddress: this.config.contractAddress,
      contractName: 'erc1155',
      functionName: 'set-approval-for-all',
      functionArgs: [
        standardPrincipalCV(operator),
        boolCV(approved)
      ],
      senderKey: this.config.senderKey,
      network: this.config.network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee: 3000n,
    });
  }

  async setTokenUri(tokenId: number, uri: string) {
    return makeContractCall({
      contractAddress: this.config.contractAddress,
      contractName: 'erc1155',
      functionName: 'set-token-uri',
      functionArgs: [
        uintCV(tokenId),
        stringAsciiCV(uri)
      ],
      senderKey: this.config.senderKey,
      network: this.config.network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee: 3000n,
    });
  }

  // Read-only functions
  async getBalance(owner: string, tokenId: number) {
    const result = await callReadOnlyFunction({
      contractAddress: this.config.contractAddress,
      contractName: 'erc1155',
      functionName: 'get-balance',
      functionArgs: [
        standardPrincipalCV(owner),
        uintCV(tokenId)
      ],
      network: this.config.network,
      senderAddress: this.config.contractAddress,
    });
    
    return cvToJSON(result).value;
  }

  async getTotalSupply(tokenId: number) {
    const result = await callReadOnlyFunction({
      contractAddress: this.config.contractAddress,
      contractName: 'erc1155',
      functionName: 'get-total-supply',
      functionArgs: [uintCV(tokenId)],
      network: this.config.network,
      senderAddress: this.config.contractAddress,
    });
    
    return cvToJSON(result).value;
  }

  async getTokenUri(tokenId: number) {
    const result = await callReadOnlyFunction({
      contractAddress: this.config.contractAddress,
      contractName: 'erc1155',
      functionName: 'get-token-uri',
      functionArgs: [uintCV(tokenId)],
      network: this.config.network,
      senderAddress: this.config.contractAddress,
    });
    
    return cvToJSON(result).value;
  }

  async isApprovedForAll(owner: string, operator: string) {
    const result = await callReadOnlyFunction({
      contractAddress: this.config.contractAddress,
      contractName: 'erc1155',
      functionName: 'is-approved-for-all',
      functionArgs: [
        standardPrincipalCV(owner),
        standardPrincipalCV(operator)
      ],
      network: this.config.network,
      senderAddress: this.config.contractAddress,
    });
    
    return cvToJSON(result).value;
  }

  // Factory Functions
  async deployMultiTokenContract(name: string) {
    return makeContractCall({
      contractAddress: this.config.contractAddress,
      contractName: 'multi-token-factory',
      functionName: 'deploy-multi-token-contract',
      functionArgs: [stringAsciiCV(name)],
      senderKey: this.config.senderKey,
      network: this.config.network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee: 15000n,
    });
  }

  async getContractInfo(contractId: number) {
    const result = await callReadOnlyFunction({
      contractAddress: this.config.contractAddress,
      contractName: 'multi-token-factory',
      functionName: 'get-contract-info',
      functionArgs: [uintCV(contractId)],
      network: this.config.network,
      senderAddress: this.config.contractAddress,
    });
    
    return cvToJSON(result).value;
  }

  // Marketplace Functions
  async createListing(
    tokenContract: string,
    tokenId: number,
    amount: number,
    pricePerToken: number,
    duration: number
  ) {
    return makeContractCall({
      contractAddress: this.config.contractAddress,
      contractName: 'token-marketplace',
      functionName: 'create-listing',
      functionArgs: [
        standardPrincipalCV(tokenContract),
        uintCV(tokenId),
        uintCV(amount),
        uintCV(pricePerToken),
        uintCV(duration)
      ],
      senderKey: this.config.senderKey,
      network: this.config.network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee: 8000n,
    });
  }

  async purchaseTokens(listingId: number, amount: number) {
    return makeContractCall({
      contractAddress: this.config.contractAddress,
      contractName: 'token-marketplace',
      functionName: 'purchase-tokens',
      functionArgs: [
        uintCV(listingId),
        uintCV(amount)
      ],
      senderKey: this.config.senderKey,
      network: this.config.network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee: 10000n,
    });
  }

  async getListing(listingId: number) {
    const result = await callReadOnlyFunction({
      contractAddress: this.config.contractAddress,
      contractName: 'token-marketplace',
      functionName: 'get-listing',
      functionArgs: [uintCV(listingId)],
      network: this.config.network,
      senderAddress: this.config.contractAddress,
    });
    
    return cvToJSON(result).value;
  }

  // Staking Functions
  async createStakingPool(
    tokenContract: string,
    tokenId: number,
    rewardRate: number,
    minStake: number,
    maxStake: number
  ) {
    return makeContractCall({
      contractAddress: this.config.contractAddress,
      contractName: 'multi-token-staking',
      functionName: 'create-staking-pool',
      functionArgs: [
        standardPrincipalCV(tokenContract),
        uintCV(tokenId),
        uintCV(rewardRate),
        uintCV(minStake),
        uintCV(maxStake)
      ],
      senderKey: this.config.senderKey,
      network: this.config.network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee: 8000n,
    });
  }

  async stakeTokens(poolId: number, amount: number) {
    return makeContractCall({
      contractAddress: this.config.contractAddress,
      contractName: 'multi-token-staking',
      functionName: 'stake-tokens',
      functionArgs: [
        uintCV(poolId),
        uintCV(amount)
      ],
      senderKey: this.config.senderKey,
      network: this.config.network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee: 8000n,
    });
  }

  async unstakeTokens(poolId: number, amount: number) {
    return makeContractCall({
      contractAddress: this.config.contractAddress,
      contractName: 'multi-token-staking',
      functionName: 'unstake-tokens',
      functionArgs: [
        uintCV(poolId),
        uintCV(amount)
      ],
      senderKey: this.config.senderKey,
      network: this.config.network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee: 8000n,
    });
  }

  async claimRewards(poolId: number) {
    return makeContractCall({
      contractAddress: this.config.contractAddress,
      contractName: 'multi-token-staking',
      functionName: 'claim-rewards',
      functionArgs: [uintCV(poolId)],
      senderKey: this.config.senderKey,
      network: this.config.network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee: 6000n,
    });
  }

  async calculatePendingRewards(user: string, poolId: number) {
    const result = await callReadOnlyFunction({
      contractAddress: this.config.contractAddress,
      contractName: 'multi-token-staking',
      functionName: 'calculate-pending-rewards',
      functionArgs: [
        standardPrincipalCV(user),
        uintCV(poolId)
      ],
      network: this.config.network,
      senderAddress: this.config.contractAddress,
    });
    
    return cvToJSON(result).value;
  }

  // Governance Functions
  async createProposal(title: string, description: string, votingDuration: number) {
    return makeContractCall({
      contractAddress: this.config.contractAddress,
      contractName: 'token-governance',
      functionName: 'create-proposal',
      functionArgs: [
        stringAsciiCV(title),
        stringAsciiCV(description),
        uintCV(votingDuration)
      ],
      senderKey: this.config.senderKey,
      network: this.config.network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee: 10000n,
    });
  }

  async voteOnProposal(proposalId: number, vote: boolean, tokens: number) {
    return makeContractCall({
      contractAddress: this.config.contractAddress,
      contractName: 'token-governance',
      functionName: 'vote-on-proposal',
      functionArgs: [
        uintCV(proposalId),
        boolCV(vote),
        uintCV(tokens)
      ],
      senderKey: this.config.senderKey,
      network: this.config.network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee: 8000n,
    });
  }

  async getProposal(proposalId: number) {
    const result = await callReadOnlyFunction({
      contractAddress: this.config.contractAddress,
      contractName: 'token-governance',
      functionName: 'get-proposal',
      functionArgs: [uintCV(proposalId)],
      network: this.config.network,
      senderAddress: this.config.contractAddress,
    });
    
    return cvToJSON(result).value;
  }

  // Auction Functions
  async createAuction(
    tokenContract: string,
    tokenId: number,
    amount: number,
    startingPrice: number,
    reservePrice: number,
    duration: number
  ) {
    return makeContractCall({
      contractAddress: this.config.contractAddress,
      contractName: 'token-auction',
      functionName: 'create-auction',
      functionArgs: [
        standardPrincipalCV(tokenContract),
        uintCV(tokenId),
        uintCV(amount),
        uintCV(startingPrice),
        uintCV(reservePrice),
        uintCV(duration)
      ],
      senderKey: this.config.senderKey,
      network: this.config.network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee: 10000n,
    });
  }

  async placeBid(auctionId: number, bidAmount: number) {
    return makeContractCall({
      contractAddress: this.config.contractAddress,
      contractName: 'token-auction',
      functionName: 'place-bid',
      functionArgs: [
        uintCV(auctionId),
        uintCV(bidAmount)
      ],
      senderKey: this.config.senderKey,
      network: this.config.network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee: 12000n,
    });
  }

  async getAuction(auctionId: number) {
    const result = await callReadOnlyFunction({
      contractAddress: this.config.contractAddress,
      contractName: 'token-auction',
      functionName: 'get-auction',
      functionArgs: [uintCV(auctionId)],
      network: this.config.network,
      senderAddress: this.config.contractAddress,
    });
    
    return cvToJSON(result).value;
  }

  // Bridge Functions
  async initiateBridgeTransfer(
    tokenContract: string,
    tokenId: number,
    amount: number,
    recipient: string,
    destinationChain: string
  ) {
    return makeContractCall({
      contractAddress: this.config.contractAddress,
      contractName: 'token-bridge',
      functionName: 'initiate-transfer',
      functionArgs: [
        standardPrincipalCV(tokenContract),
        uintCV(tokenId),
        uintCV(amount),
        stringAsciiCV(recipient),
        stringAsciiCV(destinationChain)
      ],
      senderKey: this.config.senderKey,
      network: this.config.network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee: 15000n,
    });
  }

  async getBridgeTransfer(transferId: number) {
    const result = await callReadOnlyFunction({
      contractAddress: this.config.contractAddress,
      contractName: 'token-bridge',
      functionName: 'get-transfer',
      functionArgs: [uintCV(transferId)],
      network: this.config.network,
      senderAddress: this.config.contractAddress,
    });
    
    return cvToJSON(result).value;
  }

  // Utility Functions
  async getContractStats() {
    const contracts = ['erc1155', 'multi-token-factory', 'token-marketplace', 
                     'multi-token-staking', 'token-governance', 'token-auction', 'token-bridge'];
    
    const stats: any = {};
    
    for (const contractName of contracts) {
      try {
        let functionName = 'get-contract-stats';
        if (contractName === 'multi-token-factory') functionName = 'get-factory-stats';
        if (contractName === 'token-marketplace') functionName = 'get-marketplace-stats';
        if (contractName === 'multi-token-staking') functionName = 'get-staking-stats';
        if (contractName === 'token-governance') functionName = 'get-governance-stats';
        if (contractName === 'token-auction') functionName = 'get-auction-stats';
        if (contractName === 'token-bridge') functionName = 'get-bridge-stats';
        if (contractName === 'erc1155') functionName = 'get-contract-info';

        const result = await callReadOnlyFunction({
          contractAddress: this.config.contractAddress,
          contractName,
          functionName,
          functionArgs: [],
          network: this.config.network,
          senderAddress: this.config.contractAddress,
        });
        
        stats[contractName] = cvToJSON(result).value;
      } catch (error) {
        stats[contractName] = { error: error.message };
      }
    }
    
    return stats;
  }
}

// Helper functions for common operations
export async function createMultiTokenSuite(config: MultiTokenConfig) {
  const utils = new MultiTokenUtils(config);
  
  console.log('🎨 Creating sample multi-token ecosystem...');
  
  // Create sample tokens
  const tokens = [
    { name: 'Gold', supply: 1000, uri: 'https://api.example.com/gold.json' },
    { name: 'Silver', supply: 5000, uri: 'https://api.example.com/silver.json' },
    { name: 'Bronze', supply: 10000, uri: 'https://api.example.com/bronze.json' }
  ];
  
  const results = [];
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    // Mint tokens
    const mintTx = await utils.mintTokens(config.contractAddress, 0, token.supply);
    results.push({ action: 'mint', token: token.name, tx: mintTx });
    
    // Set URI
    const uriTx = await utils.setTokenUri(i + 1, token.uri);
    results.push({ action: 'setUri', token: token.name, tx: uriTx });
  }
  
  return results;
}

export { MultiTokenUtils };