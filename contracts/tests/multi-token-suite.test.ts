import { describe, expect, it, beforeEach } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const alice = accounts.get('wallet_1')!;
const bob = accounts.get('wallet_2')!;

describe('Multi-Token Contract Suite', () => {
  beforeEach(() => {
    // Deploy all contracts
    simnet.deployContract('erc1155', 'erc1155', deployer);
    simnet.deployContract('multi-token-factory', 'multi-token-factory', deployer);
    simnet.deployContract('token-marketplace', 'token-marketplace', deployer);
    simnet.deployContract('multi-token-staking', 'multi-token-staking', deployer);
    simnet.deployContract('token-bridge', 'token-bridge', deployer);
    simnet.deployContract('token-governance', 'token-governance', deployer);
    simnet.deployContract('token-auction', 'token-auction', deployer);
  });

  describe('ERC1155 Core Functionality', () => {
    it('should mint new tokens', () => {
      const mintResult = simnet.callPublicFn(
        'erc1155',
        'mint-tokens',
        [Cl.principal(alice), Cl.uint(0), Cl.uint(100)],
        deployer
      );
      
      expect(mintResult.result).toBeOk(Cl.uint(1));
      
      // Check balance
      const balance = simnet.callReadOnlyFn(
        'erc1155',
        'get-balance',
        [Cl.principal(alice), Cl.uint(1)],
        deployer
      );
      
      expect(balance.result).toBe(Cl.uint(100));
    });

    it('should transfer tokens between users', () => {
      // First mint tokens
      simnet.callPublicFn(
        'erc1155',
        'mint-tokens',
        [Cl.principal(alice), Cl.uint(0), Cl.uint(100)],
        deployer
      );
      
      // Transfer tokens
      const transferResult = simnet.callPublicFn(
        'erc1155',
        'transfer-single',
        [Cl.principal(alice), Cl.principal(bob), Cl.uint(1), Cl.uint(50)],
        alice
      );
      
      expect(transferResult.result).toBeOk(Cl.bool(true));
      
      // Check balances
      const aliceBalance = simnet.callReadOnlyFn(
        'erc1155',
        'get-balance',
        [Cl.principal(alice), Cl.uint(1)],
        deployer
      );
      
      const bobBalance = simnet.callReadOnlyFn(
        'erc1155',
        'get-balance',
        [Cl.principal(bob), Cl.uint(1)],
        deployer
      );
      
      expect(aliceBalance.result).toBe(Cl.uint(50));
      expect(bobBalance.result).toBe(Cl.uint(50));
    });

    it('should handle batch transfers', () => {
      // Mint multiple token types
      simnet.callPublicFn('erc1155', 'mint-tokens', [Cl.principal(alice), Cl.uint(0), Cl.uint(100)], deployer);
      simnet.callPublicFn('erc1155', 'mint-tokens', [Cl.principal(alice), Cl.uint(0), Cl.uint(200)], deployer);
      
      // Batch transfer
      const batchResult = simnet.callPublicFn(
        'erc1155',
        'transfer-batch',
        [
          Cl.principal(alice),
          Cl.principal(bob),
          Cl.list([Cl.uint(1), Cl.uint(2)]),
          Cl.list([Cl.uint(30), Cl.uint(50)])
        ],
        alice
      );
      
      expect(batchResult.result).toBeOk(Cl.bool(true));
    });

    it('should handle approvals correctly', () => {
      // Set approval
      const approvalResult = simnet.callPublicFn(
        'erc1155',
        'set-approval-for-all',
        [Cl.principal(bob), Cl.bool(true)],
        alice
      );
      
      expect(approvalResult.result).toBeOk(Cl.bool(true));
      
      // Check approval status
      const isApproved = simnet.callReadOnlyFn(
        'erc1155',
        'is-approved-for-all',
        [Cl.principal(alice), Cl.principal(bob)],
        deployer
      );
      
      expect(isApproved.result).toBe(Cl.bool(true));
    });
  });

  describe('Multi-Token Factory', () => {
    it('should deploy new multi-token contracts', () => {
      const deployResult = simnet.callPublicFn(
        'multi-token-factory',
        'deploy-multi-token-contract',
        [Cl.stringAscii('test-token')],
        alice
      );
      
      expect(deployResult.result).toBeOk(Cl.uint(1));
      
      // Check contract info
      const contractInfo = simnet.callReadOnlyFn(
        'multi-token-factory',
        'get-contract-info',
        [Cl.uint(1)],
        deployer
      );
      
      expect(contractInfo.result).toBeSome();
    });

    it('should track deployer contracts', () => {
      simnet.callPublicFn(
        'multi-token-factory',
        'deploy-multi-token-contract',
        [Cl.stringAscii('test-token-1')],
        alice
      );
      
      simnet.callPublicFn(
        'multi-token-factory',
        'deploy-multi-token-contract',
        [Cl.stringAscii('test-token-2')],
        alice
      );
      
      const deployerContracts = simnet.callReadOnlyFn(
        'multi-token-factory',
        'get-contracts-by-deployer',
        [Cl.principal(alice)],
        deployer
      );
      
      expect(deployerContracts.result).toEqual(Cl.list([Cl.uint(1), Cl.uint(2)]));
    });
  });

  describe('Token Marketplace', () => {
    beforeEach(() => {
      // Mint tokens for testing
      simnet.callPublicFn('erc1155', 'mint-tokens', [Cl.principal(alice), Cl.uint(0), Cl.uint(100)], deployer);
    });

    it('should create token listings', () => {
      const listingResult = simnet.callPublicFn(
        'token-marketplace',
        'create-listing',
        [
          Cl.principal(`${deployer}.erc1155`),
          Cl.uint(1),
          Cl.uint(50),
          Cl.uint(1000000), // 1 STX per token
          Cl.uint(1440) // 1 day duration
        ],
        alice
      );
      
      expect(listingResult.result).toBeOk(Cl.uint(1));
    });

    it('should handle token purchases', () => {
      // Create listing
      simnet.callPublicFn(
        'token-marketplace',
        'create-listing',
        [
          Cl.principal(`${deployer}.erc1155`),
          Cl.uint(1),
          Cl.uint(50),
          Cl.uint(1000000),
          Cl.uint(1440)
        ],
        alice
      );
      
      // Purchase tokens
      const purchaseResult = simnet.callPublicFn(
        'token-marketplace',
        'purchase-tokens',
        [Cl.uint(1), Cl.uint(10)],
        bob
      );
      
      expect(purchaseResult.result).toBeOk(Cl.bool(true));
    });
  });

  describe('Token Staking', () => {
    beforeEach(() => {
      // Create staking pool
      simnet.callPublicFn(
        'multi-token-staking',
        'create-staking-pool',
        [
          Cl.principal(`${deployer}.erc1155`),
          Cl.uint(1),
          Cl.uint(100), // reward rate
          Cl.uint(10),  // min stake
          Cl.uint(1000) // max stake
        ],
        deployer
      );
      
      // Mint tokens for staking
      simnet.callPublicFn('erc1155', 'mint-tokens', [Cl.principal(alice), Cl.uint(0), Cl.uint(500)], deployer);
    });

    it('should create staking pools', () => {
      const poolInfo = simnet.callReadOnlyFn(
        'multi-token-staking',
        'get-pool-info',
        [Cl.uint(1)],
        deployer
      );
      
      expect(poolInfo.result).toBeSome();
    });

    it('should allow token staking', () => {
      const stakeResult = simnet.callPublicFn(
        'multi-token-staking',
        'stake-tokens',
        [Cl.uint(1), Cl.uint(100)],
        alice
      );
      
      expect(stakeResult.result).toBeOk(Cl.bool(true));
    });

    it('should calculate pending rewards', () => {
      // Stake tokens
      simnet.callPublicFn('multi-token-staking', 'stake-tokens', [Cl.uint(1), Cl.uint(100)], alice);
      
      // Advance blocks
      simnet.mineEmptyBlocks(10);
      
      // Check pending rewards
      const pendingRewards = simnet.callReadOnlyFn(
        'multi-token-staking',
        'calculate-pending-rewards',
        [Cl.principal(alice), Cl.uint(1)],
        deployer
      );
      
      expect(Number(pendingRewards.result)).toBeGreaterThan(0);
    });
  });

  describe('Token Governance', () => {
    it('should create governance proposals', () => {
      const proposalResult = simnet.callPublicFn(
        'token-governance',
        'create-proposal',
        [
          Cl.stringAscii('Test Proposal'),
          Cl.stringAscii('This is a test governance proposal'),
          Cl.uint(1440) // 1 day voting period
        ],
        alice
      );
      
      expect(proposalResult.result).toBeOk(Cl.uint(1));
    });

    it('should handle voting on proposals', () => {
      // Create proposal
      simnet.callPublicFn(
        'token-governance',
        'create-proposal',
        [
          Cl.stringAscii('Test Proposal'),
          Cl.stringAscii('Test description'),
          Cl.uint(1440)
        ],
        alice
      );
      
      // Advance to voting period
      simnet.mineEmptyBlocks(150);
      
      // Vote on proposal
      const voteResult = simnet.callPublicFn(
        'token-governance',
        'vote-on-proposal',
        [Cl.uint(1), Cl.bool(true), Cl.uint(100)],
        bob
      );
      
      expect(voteResult.result).toBeOk(Cl.bool(true));
    });
  });

  describe('Token Auction', () => {
    beforeEach(() => {
      // Mint tokens for auction
      simnet.callPublicFn('erc1155', 'mint-tokens', [Cl.principal(alice), Cl.uint(0), Cl.uint(100)], deployer);
    });

    it('should create token auctions', () => {
      const auctionResult = simnet.callPublicFn(
        'token-auction',
        'create-auction',
        [
          Cl.principal(`${deployer}.erc1155`),
          Cl.uint(1),
          Cl.uint(50),
          Cl.uint(1000000), // starting price
          Cl.uint(2000000), // reserve price
          Cl.uint(1440)     // duration
        ],
        alice
      );
      
      expect(auctionResult.result).toBeOk(Cl.uint(1));
    });

    it('should handle auction bidding', () => {
      // Create auction
      simnet.callPublicFn(
        'token-auction',
        'create-auction',
        [
          Cl.principal(`${deployer}.erc1155`),
          Cl.uint(1),
          Cl.uint(50),
          Cl.uint(1000000),
          Cl.uint(2000000),
          Cl.uint(1440)
        ],
        alice
      );
      
      // Advance to auction start
      simnet.mineEmptyBlocks(150);
      
      // Place bid
      const bidResult = simnet.callPublicFn(
        'token-auction',
        'place-bid',
        [Cl.uint(1), Cl.uint(1500000)],
        bob
      );
      
      expect(bidResult.result).toBeOk(Cl.bool(true));
    });
  });

  describe('Integration Tests', () => {
    it('should work across multiple contracts', () => {
      // 1. Deploy factory contract
      const factoryResult = simnet.callPublicFn(
        'multi-token-factory',
        'deploy-multi-token-contract',
        [Cl.stringAscii('integration-test')],
        alice
      );
      expect(factoryResult.result).toBeOk(Cl.uint(1));
      
      // 2. Mint tokens
      const mintResult = simnet.callPublicFn(
        'erc1155',
        'mint-tokens',
        [Cl.principal(alice), Cl.uint(0), Cl.uint(1000)],
        deployer
      );
      expect(mintResult.result).toBeOk(Cl.uint(1));
      
      // 3. Create marketplace listing
      const listingResult = simnet.callPublicFn(
        'token-marketplace',
        'create-listing',
        [
          Cl.principal(`${deployer}.erc1155`),
          Cl.uint(1),
          Cl.uint(100),
          Cl.uint(1000000),
          Cl.uint(1440)
        ],
        alice
      );
      expect(listingResult.result).toBeOk(Cl.uint(1));
      
      // 4. Create staking pool
      const poolResult = simnet.callPublicFn(
        'multi-token-staking',
        'create-staking-pool',
        [
          Cl.principal(`${deployer}.erc1155`),
          Cl.uint(1),
          Cl.uint(50),
          Cl.uint(10),
          Cl.uint(500)
        ],
        deployer
      );
      expect(poolResult.result).toBeOk(Cl.uint(1));
      
      // 5. Stake some tokens
      const stakeResult = simnet.callPublicFn(
        'multi-token-staking',
        'stake-tokens',
        [Cl.uint(1), Cl.uint(200)],
        alice
      );
      expect(stakeResult.result).toBeOk(Cl.bool(true));
    });
  });
});