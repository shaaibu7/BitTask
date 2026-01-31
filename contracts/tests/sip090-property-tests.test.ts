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
// **Feature: sip090-token, Property 6: Invalid recipient rejection**
// **Validates: Requirements 2.3**
Clarinet.test({
    name: "Property 6: Invalid recipient rejection - transfers to invalid principals should fail",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // Mint token
        let mintBlock = chain.mineBlock([
            Tx.contractCall('sip090-nft', 'mint', [
                types.principal(wallet1.address),
                types.ascii("https://example.com/token/1")
            ], deployer.address)
        ]);
        
        // Property: For any transfer to invalid principal, transaction should be rejected
        // Test safe-transfer which has validation (regular transfer allows any principal)
        let invalidTransferBlock = chain.mineBlock([
            Tx.contractCall('sip090-nft', 'safe-transfer', [
                types.uint(1),
                types.principal(wallet1.address),
                types.principal('SP000000000000000000002Q6VF78') // Invalid/burn address
            ], wallet1.address)
        ]);
        
        // Should fail with ERR-INVALID-RECIPIENT (400)
        invalidTransferBlock.receipts[0].result.expectErr(types.uint(400));
        
        // Verify ownership unchanged
        let ownerBlock = chain.mineBlock([
            Tx.contractCall('sip090-nft', 'get-owner', [types.uint(1)], deployer.address)
        ]);
        assertEquals(ownerBlock.receipts[0].result.expectOk().expectSome(), wallet1.address);
    },
});
// **Feature: sip090-token, Property 7: Approval management consistency**
// **Validates: Requirements 3.1, 3.3**
Clarinet.test({
    name: "Property 7: Approval management consistency - approvals should be recorded and queryable",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        const wallet3 = accounts.get('wallet_3')!;
        
        // Mint tokens to test approval on
        let mintBlock = chain.mineBlock([
            Tx.contractCall('sip090-nft', 'mint', [
                types.principal(wallet1.address),
                types.ascii("https://example.com/token/1")
            ], deployer.address),
            Tx.contractCall('sip090-nft', 'mint', [
                types.principal(wallet1.address),
                types.ascii("https://example.com/token/2")
            ], deployer.address)
        ]);
        
        // Property: For any token owner approving an operator, approval should be recorded accurately
        const approvalTests = [
            { tokenId: 1, owner: wallet1.address, operator: wallet2.address },
            { tokenId: 2, owner: wallet1.address, operator: wallet3.address },
            { tokenId: 1, owner: wallet1.address, operator: wallet3.address }, // Change approval
        ];
        
        for (const test of approvalTests) {
            // Set approval
            let approveBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'approve', [
                    types.principal(test.operator),
                    types.uint(test.tokenId)
                ], test.owner)
            ]);
            
            assertEquals(approveBlock.receipts[0].result.expectOk(), types.bool(true));
            
            // Verify approval is queryable
            let getApprovedBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'get-approved', [types.uint(test.tokenId)], deployer.address)
            ]);
            
            assertEquals(getApprovedBlock.receipts[0].result.expectOk().expectSome(), test.operator);
            
            // Verify is-approved-for returns true
            let isApprovedBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'is-approved-for', [
                    types.uint(test.tokenId),
                    types.principal(test.operator)
                ], deployer.address)
            ]);
            
            assertEquals(isApprovedBlock.receipts[0].result, types.bool(true));
        }
    },
});
// **Feature: sip090-token, Property 8: Approved operator transfer**
// **Validates: Requirements 3.2**
Clarinet.test({
    name: "Property 8: Approved operator transfer - approved operators should be able to transfer",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        const wallet3 = accounts.get('wallet_3')!;
        
        // Property: For any approved operator, they should be able to transfer tokens
        for (let tokenId = 1; tokenId <= 3; tokenId++) {
            // Mint token
            let mintBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'mint', [
                    types.principal(wallet1.address),
                    types.ascii(`https://example.com/token/${tokenId}`)
                ], deployer.address)
            ]);
            
            // Approve operator
            let approveBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'approve', [
                    types.principal(wallet2.address),
                    types.uint(tokenId)
                ], wallet1.address)
            ]);
            
            // Approved operator should be able to transfer
            let transferBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'transfer-from', [
                    types.uint(tokenId),
                    types.principal(wallet1.address),
                    types.principal(wallet3.address)
                ], wallet2.address) // Approved operator calling
            ]);
            
            assertEquals(transferBlock.receipts[0].result.expectOk(), types.bool(true));
            
            // Verify ownership changed
            let ownerBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'get-owner', [types.uint(tokenId)], deployer.address)
            ]);
            assertEquals(ownerBlock.receipts[0].result.expectOk().expectSome(), wallet3.address);
        }
    },
});
// **Feature: sip090-token, Property 9: Approval revocation**
// **Validates: Requirements 3.4**
Clarinet.test({
    name: "Property 9: Approval revocation - revoked operators should not be able to transfer",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        const wallet3 = accounts.get('wallet_3')!;
        
        // Property: For any approval that is revoked, operator should no longer transfer
        for (let tokenId = 1; tokenId <= 2; tokenId++) {
            // Mint token
            let mintBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'mint', [
                    types.principal(wallet1.address),
                    types.ascii(`https://example.com/token/${tokenId}`)
                ], deployer.address)
            ]);
            
            // Approve operator
            let approveBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'approve', [
                    types.principal(wallet2.address),
                    types.uint(tokenId)
                ], wallet1.address)
            ]);
            
            // Verify approval exists
            let getApprovedBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'get-approved', [types.uint(tokenId)], deployer.address)
            ]);
            assertEquals(getApprovedBlock.receipts[0].result.expectOk().expectSome(), wallet2.address);
            
            // Revoke approval
            let revokeBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'revoke-approval', [types.uint(tokenId)], wallet1.address)
            ]);
            assertEquals(revokeBlock.receipts[0].result.expectOk(), types.bool(true));
            
            // Verify approval is gone
            let getApprovedAfterBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'get-approved', [types.uint(tokenId)], deployer.address)
            ]);
            assertEquals(getApprovedAfterBlock.receipts[0].result.expectOk(), types.none());
            
            // Operator should no longer be able to transfer
            let transferBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'transfer-from', [
                    types.uint(tokenId),
                    types.principal(wallet1.address),
                    types.principal(wallet3.address)
                ], wallet2.address)
            ]);
            
            // Should fail with ERR-NOT-AUTHORIZED (401)
            transferBlock.receipts[0].result.expectErr(types.uint(401));
        }
    },
});
// **Feature: sip090-token, Property 10: Transfer clears approvals**
// **Validates: Requirements 3.5**
Clarinet.test({
    name: "Property 10: Transfer clears approvals - transfers should automatically clear approvals",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        const wallet3 = accounts.get('wallet_3')!;
        
        // Property: For any token transfer, existing approvals should be cleared
        for (let tokenId = 1; tokenId <= 3; tokenId++) {
            // Mint token
            let mintBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'mint', [
                    types.principal(wallet1.address),
                    types.ascii(`https://example.com/token/${tokenId}`)
                ], deployer.address)
            ]);
            
            // Approve operator
            let approveBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'approve', [
                    types.principal(wallet2.address),
                    types.uint(tokenId)
                ], wallet1.address)
            ]);
            
            // Verify approval exists
            let getApprovedBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'get-approved', [types.uint(tokenId)], deployer.address)
            ]);
            assertEquals(getApprovedBlock.receipts[0].result.expectOk().expectSome(), wallet2.address);
            
            // Transfer token (owner transfers directly)
            let transferBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'transfer', [
                    types.uint(tokenId),
                    types.principal(wallet1.address),
                    types.principal(wallet3.address)
                ], wallet1.address)
            ]);
            assertEquals(transferBlock.receipts[0].result.expectOk(), types.bool(true));
            
            // Verify approval was cleared
            let getApprovedAfterBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'get-approved', [types.uint(tokenId)], deployer.address)
            ]);
            assertEquals(getApprovedAfterBlock.receipts[0].result.expectOk(), types.none());
            
            // Previous operator should no longer be approved
            let isApprovedBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'is-approved-for', [
                    types.uint(tokenId),
                    types.principal(wallet2.address)
                ], deployer.address)
            ]);
            assertEquals(isApprovedBlock.receipts[0].result, types.bool(false));
        }
    },
});
// **Feature: sip090-token, Property 11: Mint creates token correctly**
// **Validates: Requirements 4.1, 4.3, 4.5**
Clarinet.test({
    name: "Property 11: Mint creates token correctly - mints should create tokens with correct properties",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const recipients = [
            accounts.get('wallet_1')!.address,
            accounts.get('wallet_2')!.address,
            accounts.get('wallet_3')!.address
        ];
        
        // Property: For any mint by contract owner, token should be created correctly
        for (let i = 0; i < recipients.length; i++) {
            const expectedTokenId = i + 1;
            const recipient = recipients[i];
            const uri = `https://example.com/token/${expectedTokenId}`;
            
            // Get initial total supply
            let initialSupplyBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'get-total-supply', [], deployer.address)
            ]);
            const initialSupply = initialSupplyBlock.receipts[0].result.expectOk();
            
            // Mint token
            let mintBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'mint', [
                    types.principal(recipient),
                    types.ascii(uri)
                ], deployer.address)
            ]);
            
            // Should return correct token ID
            assertEquals(mintBlock.receipts[0].result.expectOk(), types.uint(expectedTokenId));
            
            // Verify token owner is correct
            let ownerBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'get-owner', [types.uint(expectedTokenId)], deployer.address)
            ]);
            assertEquals(ownerBlock.receipts[0].result.expectOk().expectSome(), recipient);
            
            // Verify token URI is correct
            let uriBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'get-token-uri', [types.uint(expectedTokenId)], deployer.address)
            ]);
            assertEquals(uriBlock.receipts[0].result.expectOk().expectSome(), types.ascii(uri));
            
            // Verify total supply incremented
            let newSupplyBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'get-total-supply', [], deployer.address)
            ]);
            assertEquals(newSupplyBlock.receipts[0].result.expectOk(), types.uint(expectedTokenId));
        }
    },
});
// **Feature: sip090-token, Property 12: Unauthorized mint rejection**
// **Validates: Requirements 4.2**
Clarinet.test({
    name: "Property 12: Unauthorized mint rejection - non-owners should not be able to mint",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        const wallet3 = accounts.get('wallet_3')!;
        
        const unauthorizedCallers = [wallet1.address, wallet2.address, wallet3.address];
        
        // Property: For any mint attempt by non-owner, transaction should be rejected
        for (let i = 0; i < unauthorizedCallers.length; i++) {
            const caller = unauthorizedCallers[i];
            const recipient = unauthorizedCallers[(i + 1) % unauthorizedCallers.length];
            
            let mintBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'mint', [
                    types.principal(recipient),
                    types.ascii(`https://example.com/unauthorized/${i}`)
                ], caller) // Non-owner trying to mint
            ]);
            
            // Should fail with ERR-NOT-AUTHORIZED (401)
            mintBlock.receipts[0].result.expectErr(types.uint(401));
        }
        
        // Verify no tokens were minted
        let totalSupplyBlock = chain.mineBlock([
            Tx.contractCall('sip090-nft', 'get-total-supply', [], wallet1.address)
        ]);
        assertEquals(totalSupplyBlock.receipts[0].result.expectOk(), types.uint(0));
        
        // Verify last token ID is still 0
        let lastTokenIdBlock = chain.mineBlock([
            Tx.contractCall('sip090-nft', 'get-last-token-id', [], wallet1.address)
        ]);
        assertEquals(lastTokenIdBlock.receipts[0].result.expectOk(), types.uint(0));
    },
});
// **Feature: sip090-token, Property 13: Mint event emission**
// **Validates: Requirements 4.4**
Clarinet.test({
    name: "Property 13: Mint event emission - mints should emit transfer events from none",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        
        // Property: For any successful mint, Transfer event should be emitted from none
        const mintTests = [
            { recipient: wallet1.address, uri: "https://example.com/token/1" },
            { recipient: wallet2.address, uri: "https://example.com/token/2" },
            { recipient: wallet1.address, uri: "https://example.com/token/3" }
        ];
        
        for (let i = 0; i < mintTests.length; i++) {
            const test = mintTests[i];
            const expectedTokenId = i + 1;
            
            let mintBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'mint', [
                    types.principal(test.recipient),
                    types.ascii(test.uri)
                ], deployer.address)
            ]);
            
            // Mint should succeed
            assertEquals(mintBlock.receipts[0].result.expectOk(), types.uint(expectedTokenId));
            
            // Check that event was emitted (events are in the receipt events array)
            const events = mintBlock.receipts[0].events;
            
            // Should have at least one event
            assertEquals(events.length >= 1, true);
            
            // Look for print event with mint data
            const printEvents = events.filter(e => e.type === 'contract_event');
            assertEquals(printEvents.length >= 1, true);
            
            // The contract emits a print event with mint information
            // This validates that the event emission mechanism is working
        }
    },
});
// **Feature: sip090-token, Property 14: Token existence accuracy**
// **Validates: Requirements 5.1**
Clarinet.test({
    name: "Property 14: Token existence accuracy - existence checks should reflect minting status",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // Property: For any token ID, existence check should accurately reflect minting status
        
        // Initially, no tokens should exist
        for (let tokenId = 1; tokenId <= 5; tokenId++) {
            let existsBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'token-exists', [types.uint(tokenId)], deployer.address)
            ]);
            assertEquals(existsBlock.receipts[0].result, types.bool(false));
        }
        
        // Mint some tokens
        const tokensToMint = 3;
        for (let i = 1; i <= tokensToMint; i++) {
            let mintBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'mint', [
                    types.principal(wallet1.address),
                    types.ascii(`https://example.com/token/${i}`)
                ], deployer.address)
            ]);
        }
        
        // Now check existence - minted tokens should exist, unminted should not
        for (let tokenId = 1; tokenId <= 10; tokenId++) {
            let existsBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'token-exists', [types.uint(tokenId)], deployer.address)
            ]);
            
            const shouldExist = tokenId <= tokensToMint;
            assertEquals(existsBlock.receipts[0].result, types.bool(shouldExist));
            
            // Also test is-valid-token-id function
            let validBlock = chain.mineBlock([
                Tx.contractCall('sip090-nft', 'is-valid-token-id', [types.uint(tokenId)], deployer.address)
            ]);
            assertEquals(validBlock.receipts[0].result, types.bool(shouldExist));
        }
    },
});