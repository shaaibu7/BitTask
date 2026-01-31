import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

/**
 * Edge Case Tests for SIP-090 NFT Contract
 * 
 * These tests cover boundary conditions and edge cases
 * to ensure robust contract behavior.
 */

Clarinet.test({
    name: "Edge Case: Self-transfer prevention",
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
        
        // Attempt self-transfer using safe-transfer (has validation)
        let selfTransferBlock = chain.mineBlock([
            Tx.contractCall('sip090-nft', 'safe-transfer', [
                types.uint(1),
                types.principal(wallet1.address),
                types.principal(wallet1.address) // Same address
            ], wallet1.address)
        ]);
        
        // Should fail with ERR-SELF-TRANSFER (406)
        selfTransferBlock.receipts[0].result.expectErr(types.uint(406));
        
        // Verify ownership unchanged
        let ownerBlock = chain.mineBlock([
            Tx.contractCall('sip090-nft', 'get-owner', [types.uint(1)], deployer.address)
        ]);
        assertEquals(ownerBlock.receipts[0].result.expectOk().expectSome(), wallet1.address);
    },
});
Clarinet.test({
    name: "Edge Case: Empty URI validation",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // Attempt to mint with empty URI using safe-mint
        let emptyUriBlock = chain.mineBlock([
            Tx.contractCall('sip090-nft', 'safe-mint', [
                types.principal(wallet1.address),
                types.ascii("") // Empty URI
            ], deployer.address)
        ]);
        
        // Should fail with ERR-INVALID-URI (407)
        emptyUriBlock.receipts[0].result.expectErr(types.uint(407));
        
        // Verify no token was created
        let totalSupplyBlock = chain.mineBlock([
            Tx.contractCall('sip090-nft', 'get-total-supply', [], deployer.address)
        ]);
        assertEquals(totalSupplyBlock.receipts[0].result.expectOk(), types.uint(0));
    },
});