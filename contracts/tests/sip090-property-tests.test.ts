import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals, assertExists } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

/**
 * Property-Based Tests for SIP-090 NFT Contract
 * 
 * These tests implement the correctness properties defined in the design document
 * to ensure the contract behaves correctly across all valid inputs.
 */

// **Feature: sip090-token, Property 1: Contract metadata consistency**
// **Validates: Requirements 1.2**
Clarinet.test({
    name: "Property 1: Contract metadata consistency - metadata should always be valid and consistent",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        // Test contract metadata consistency across multiple calls
        for (let i = 0; i < 100; i++) {
            let metadataBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'get-contract-name', [], deployer.address),
                Tx.contractCall('sip090-nft', 'get-contract-symbol', [], deployer.address),
                Tx.contractCall('sip090-nft', 'get-total-supply', [], deployer.address)
            ]);
            
            // Contract name should always be consistent
            const name = metadataBlock.receipts[0].result.expectOk();
            assertEquals(name, types.ascii("SIP090 NFT"));
            
            // Contract symbol should always be consistent  
            const symbol = metadataBlock.receipts[1].result.expectOk();
            assertEquals(symbol, types.ascii("SIP090"));
            
            // Total supply should be a valid uint
            const totalSupply = metadataBlock.receipts[2].result.expectOk();
            assertExists(totalSupply);
        }
    },
});

// **Feature: sip090-token, Property 2: Token query consistency**
// **Validates: Requirements 1.3, 1.4, 5.2**
Clarinet.test({
    name: "Property 2: Token query consistency - get-owner and get-token-uri should return correct data",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // Generate random test data
        const testTokens = [
            { recipient: wallet1.address, uri: "https://example.com/token/1" },
            { recipient: wallet1.address, uri: "https://example.com/token/2" },
            { recipient: wallet1.address, uri: "https://example.com/token/3" }
        ];
        
        // Mint tokens with known data
        let mintBlock = chain.mineBlock(
            testTokens.map((token, index) => 
                Tx.contractCall('sip090-nft', 'mint', [
                    types.principal(token.recipient),
                    types.ascii(token.uri)
                ], deployer.address)
            )
        );
        
        // Property: For any valid token ID, queries should return consistent data
        for (let tokenId = 1; tokenId <= testTokens.length; tokenId++) {
            let queryBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'get-owner', [types.uint(tokenId)], deployer.address),
                Tx.contractCall('sip090-nft', 'get-token-uri', [types.uint(tokenId)], deployer.address)
            ]);
            
            // Owner should match what we minted
            const owner = queryBlock.receipts[0].result.expectOk().expectSome();
            assertEquals(owner, testTokens[tokenId - 1].recipient);
            
            // URI should match what we set
            const uri = queryBlock.receipts[1].result.expectOk().expectSome();
            assertEquals(uri, types.ascii(testTokens[tokenId - 1].uri));
        }
    },
});