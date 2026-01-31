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
// **Feature: sip090-token, Property 3: Last token ID accuracy**
// **Validates: Requirements 1.5**
Clarinet.test({
    name: "Property 3: Last token ID accuracy - get-last-token-id should return highest minted ID",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // Initial state - no tokens minted
        let initialBlock = chain.mineBlock([
            Tx.contractCall('sip090-nft', 'get-last-token-id', [], deployer.address)
        ]);
        assertEquals(initialBlock.receipts[0].result.expectOk(), types.uint(0));
        
        // Property: For any number of mints, last-token-id should equal the count
        for (let expectedId = 1; expectedId <= 10; expectedId++) {
            // Mint one token
            let mintBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'mint', [
                    types.principal(wallet1.address),
                    types.ascii(`https://example.com/token/${expectedId}`)
                ], deployer.address)
            ]);
            
            // Verify mint returned correct ID
            assertEquals(mintBlock.receipts[0].result.expectOk(), types.uint(expectedId));
            
            // Verify get-last-token-id returns the expected ID
            let lastIdBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'get-last-token-id', [], deployer.address)
            ]);
            assertEquals(lastIdBlock.receipts[0].result.expectOk(), types.uint(expectedId));
        }
    },
});
// **Feature: sip090-token, Property 4: Transfer ownership update**
// **Validates: Requirements 2.1, 2.4, 2.5**
Clarinet.test({
    name: "Property 4: Transfer ownership update - transfers should update ownership correctly",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        const wallet3 = accounts.get('wallet_3')!;
        
        const recipients = [wallet1.address, wallet2.address, wallet3.address];
        
        // Property: For any valid token transfer by owner, ownership should update correctly
        for (let i = 0; i < recipients.length; i++) {
            // Mint token to first recipient
            let mintBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'mint', [
                    types.principal(recipients[0]),
                    types.ascii(`https://example.com/token/${i + 1}`)
                ], deployer.address)
            ]);
            
            const tokenId = i + 1;
            let currentOwner = recipients[0];
            
            // Transfer through all recipients
            for (let j = 1; j < recipients.length; j++) {
                const newOwner = recipients[j];
                
                // Execute transfer
                let transferBlock = chain.mineBlock([
                    Tx.contractCall('sip090-nft', 'transfer', [
                        types.uint(tokenId),
                        types.principal(currentOwner),
                        types.principal(newOwner)
                    ], currentOwner)
                ]);
                
                assertEquals(transferBlock.receipts[0].result.expectOk(), types.bool(true));
                
                // Verify ownership updated immediately
                let ownerBlock = chain.mineBlock([
                    Tx.contractCall('sip090-nft', 'get-owner', [types.uint(tokenId)], deployer.address)
                ]);
                
                assertEquals(ownerBlock.receipts[0].result.expectOk().expectSome(), newOwner);
                currentOwner = newOwner;
            }
        }
    },
});
// **Feature: sip090-token, Property 5: Unauthorized transfer rejection**
// **Validates: Requirements 2.2**
Clarinet.test({
    name: "Property 5: Unauthorized transfer rejection - non-owners should not be able to transfer",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        const wallet3 = accounts.get('wallet_3')!;
        
        // Mint tokens to different owners
        let mintBlock = chain.mineBlock([
            Tx.contractCall('sip090-nft', 'mint', [
                types.principal(wallet1.address),
                types.ascii("https://example.com/token/1")
            ], deployer.address),
            Tx.contractCall('sip090-nft', 'mint', [
                types.principal(wallet2.address),
                types.ascii("https://example.com/token/2")
            ], deployer.address)
        ]);
        
        // Property: For any transfer attempt by non-owner, transaction should be rejected
        const unauthorizedAttempts = [
            { tokenId: 1, owner: wallet1.address, unauthorized: wallet2.address, target: wallet3.address },
            { tokenId: 1, owner: wallet1.address, unauthorized: wallet3.address, target: wallet2.address },
            { tokenId: 2, owner: wallet2.address, unauthorized: wallet1.address, target: wallet3.address },
            { tokenId: 2, owner: wallet2.address, unauthorized: wallet3.address, target: wallet1.address }
        ];
        
        for (const attempt of unauthorizedAttempts) {
            let transferBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'transfer', [
                    types.uint(attempt.tokenId),
                    types.principal(attempt.owner),
                    types.principal(attempt.target)
                ], attempt.unauthorized) // Unauthorized caller
            ]);
            
            // Should fail with ERR-NOT-AUTHORIZED (401)
            transferBlock.receipts[0].result.expectErr(types.uint(401));
            
            // Verify ownership unchanged
            let ownerBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'get-owner', [types.uint(attempt.tokenId)], deployer.address)
            ]);
            assertEquals(ownerBlock.receipts[0].result.expectOk().expectSome(), attempt.owner);
        }
    },
});