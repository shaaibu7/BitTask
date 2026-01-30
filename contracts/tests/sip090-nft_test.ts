import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "SIP-090 NFT: Can mint tokens",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('sip090-nft', 'mint', [
                types.principal(wallet1.address),
                types.ascii("https://example.com/token/1")
            ], deployer.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result.expectOk(), types.uint(1));
        
        // Check token owner
        let getOwnerBlock = chain.mineBlock([
            Tx.contractCall('sip090-nft', 'get-owner', [types.uint(1)], deployer.address)
        ]);
        
        assertEquals(getOwnerBlock.receipts[0].result.expectOk().expectSome(), wallet1.address);
    },
});

Clarinet.test({
    name: "SIP-090 NFT: Can transfer tokens",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        
        // Mint token first
        let mintBlock = chain.mineBlock([
            Tx.contractCall('sip090-nft', 'mint', [
                types.principal(wallet1.address),
                types.ascii("https://example.com/token/1")
            ], deployer.address)
        ]);
        
        // Transfer token
        let transferBlock = chain.mineBlock([
            Tx.contractCall('sip090-nft', 'transfer', [
                types.uint(1),
                types.principal(wallet1.address),
                types.principal(wallet2.address)
            ], wallet1.address)
        ]);
        
        assertEquals(transferBlock.receipts[0].result.expectOk(), types.bool(true));
        
        // Check new owner
        let getOwnerBlock = chain.mineBlock([
            Tx.contractCall('sip090-nft', 'get-owner', [types.uint(1)], deployer.address)
        ]);
        
        assertEquals(getOwnerBlock.receipts[0].result.expectOk().expectSome(), wallet2.address);
    },
});

Clarinet.test({
    name: "SIP-090 NFT: Can approve and transfer from",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        const wallet3 = accounts.get('wallet_3')!;
        
        // Mint token
        let mintBlock = chain.mineBlock([
            Tx.contractCall('sip090-nft', 'mint', [
                types.principal(wallet1.address),
                types.ascii("https://example.com/token/1")
            ], deployer.address)
        ]);
        
        // Approve wallet2 to transfer
        let approveBlock = chain.mineBlock([
            Tx.contractCall('sip090-nft', 'approve', [
                types.principal(wallet2.address),
                types.uint(1)
            ], wallet1.address)
        ]);
        
        assertEquals(approveBlock.receipts[0].result.expectOk(), types.bool(true));
        
        // Transfer from approved account
        let transferFromBlock = chain.mineBlock([
            Tx.contractCall('sip090-nft', 'transfer-from', [
                types.uint(1),
                types.principal(wallet1.address),
                types.principal(wallet3.address)
            ], wallet2.address)
        ]);
        
        assertEquals(transferFromBlock.receipts[0].result.expectOk(), types.bool(true));
        
        // Check new owner
        let getOwnerBlock = chain.mineBlock([
            Tx.contractCall('sip090-nft', 'get-owner', [types.uint(1)], deployer.address)
        ]);
        
        assertEquals(getOwnerBlock.receipts[0].result.expectOk().expectSome(), wallet3.address);
    },
});