import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';

/**
 * Deployment script for SIP-090 NFT contract
 * This script demonstrates how to deploy and initialize the contract
 */

export function deploySIP090Contract(chain: Chain, deployer: Account) {
  console.log("Deploying SIP-090 NFT Contract...");
  
  // The contract is automatically deployed by Clarinet
  // This function can be used for post-deployment initialization
  
  let block = chain.mineBlock([
    // Example: Mint initial tokens
    Tx.contractCall('sip090-nft', 'mint', [
      types.principal(deployer.address),
      types.ascii("https://example.com/genesis-token")
    ], deployer.address)
  ]);
  
  console.log("Genesis token minted:", block.receipts[0].result);
  
  return block;
}

export function setupInitialTokens(chain: Chain, deployer: Account, recipients: string[]) {
  console.log("Setting up initial token distribution...");
  
  const transactions = recipients.map((recipient, index) => 
    Tx.contractCall('sip090-nft', 'mint', [
      types.principal(recipient),
      types.ascii(`https://example.com/token/${index + 1}`)
    ], deployer.address)
  );
  
  let block = chain.mineBlock(transactions);
  
  console.log(`Minted ${recipients.length} tokens`);
  return block;
}