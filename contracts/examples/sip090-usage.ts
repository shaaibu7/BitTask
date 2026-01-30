import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';

/**
 * Example usage patterns for SIP-090 NFT contract
 * Demonstrates common operations and best practices
 */

export class SIP090Examples {
  
  static mintAndTransferExample(chain: Chain, deployer: Account, recipient: Account, operator: Account) {
    console.log("=== Mint and Transfer Example ===");
    
    // 1. Mint a new token
    let mintBlock = chain.mineBlock([
      Tx.contractCall('sip090-nft', 'mint', [
        types.principal(recipient.address),
        types.ascii("https://example.com/artwork/1")
      ], deployer.address)
    ]);
    
    console.log("Token minted:", mintBlock.receipts[0].result);
    
    // 2. Check owner
    let ownerBlock = chain.mineBlock([
      Tx.contractCall('sip090-nft', 'get-owner', [types.uint(1)], deployer.address)
    ]);
    
    console.log("Token owner:", ownerBlock.receipts[0].result);
    
    // 3. Transfer token
    let transferBlock = chain.mineBlock([
      Tx.contractCall('sip090-nft', 'transfer', [
        types.uint(1),
        types.principal(recipient.address),
        types.principal(operator.address)
      ], recipient.address)
    ]);
    
    console.log("Transfer result:", transferBlock.receipts[0].result);
    
    return { mintBlock, ownerBlock, transferBlock };
  }
  
  static approvalWorkflowExample(chain: Chain, deployer: Account, owner: Account, operator: Account, recipient: Account) {
    console.log("=== Approval Workflow Example ===");
    
    // 1. Mint token to owner
    let mintBlock = chain.mineBlock([
      Tx.contractCall('sip090-nft', 'mint', [
        types.principal(owner.address),
        types.ascii("https://example.com/collectible/1")
      ], deployer.address)
    ]);
    
    // 2. Owner approves operator
    let approveBlock = chain.mineBlock([
      Tx.contractCall('sip090-nft', 'approve', [
        types.principal(operator.address),
        types.uint(1)
      ], owner.address)
    ]);
    
    console.log("Approval result:", approveBlock.receipts[0].result);
    
    // 3. Operator transfers on behalf of owner
    let transferFromBlock = chain.mineBlock([
      Tx.contractCall('sip090-nft', 'transfer-from', [
        types.uint(1),
        types.principal(owner.address),
        types.principal(recipient.address)
      ], operator.address)
    ]);
    
    console.log("Transfer-from result:", transferFromBlock.receipts[0].result);
    
    return { mintBlock, approveBlock, transferFromBlock };
  }
  
  static batchOperationsExample(chain: Chain, deployer: Account, recipients: Account[]) {
    console.log("=== Batch Operations Example ===");
    
    const recipientAddresses = recipients.map(r => types.principal(r.address));
    const tokenUris = recipients.map((_, i) => types.ascii(`https://example.com/batch/${i + 1}`));
    
    // Batch mint multiple tokens
    let batchMintBlock = chain.mineBlock([
      Tx.contractCall('sip090-nft', 'batch-mint', [
        types.list(recipientAddresses),
        types.list(tokenUris)
      ], deployer.address)
    ]);
    
    console.log("Batch mint result:", batchMintBlock.receipts[0].result);
    
    return batchMintBlock;
  }
  
  static queryOperationsExample(chain: Chain, deployer: Account) {
    console.log("=== Query Operations Example ===");
    
    // Get contract metadata
    let nameBlock = chain.mineBlock([
      Tx.contractCall('sip090-nft', 'get-contract-name', [], deployer.address)
    ]);
    
    let symbolBlock = chain.mineBlock([
      Tx.contractCall('sip090-nft', 'get-contract-symbol', [], deployer.address)
    ]);
    
    let supplyBlock = chain.mineBlock([
      Tx.contractCall('sip090-nft', 'get-total-supply', [], deployer.address)
    ]);
    
    console.log("Contract name:", nameBlock.receipts[0].result);
    console.log("Contract symbol:", symbolBlock.receipts[0].result);
    console.log("Total supply:", supplyBlock.receipts[0].result);
    
    return { nameBlock, symbolBlock, supplyBlock };
  }
}