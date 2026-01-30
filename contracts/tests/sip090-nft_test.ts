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
Clarinet.test({
    name: "SIP-090 NFT: Unauthorized mint fails",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('sip090-nft', 'mint', [
                types.principal(wallet2.address),
                types.ascii("https://example.com/token/1")
            ], wallet1.address) // Non-owner trying to mint
        ]);
        
        assertEquals(block.receipts.length, 1);
        block.receipts[0].result.expectErr(types.uint(401)); // ERR-NOT-AUTHORIZED
    },
});

Clarinet.test({
    name: "SIP-090 NFT: Batch mint works correctly",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('sip090-nft', 'batch-mint', [
                types.list([types.principal(wallet1.address), types.principal(wallet2.address)]),
                types.list([types.ascii("https://example.com/1"), types.ascii("https://example.com/2")])
            ], deployer.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result.expectOk().expectList().length, 2);
        
        // Check both tokens were minted
        let owner1Block = chain.mineBlock([
            Tx.contractCall('sip090-nft', 'get-owner', [types.uint(1)], deployer.address)
        ]);
        let owner2Block = chain.mineBlock([
            Tx.contractCall('sip090-nft', 'get-owner', [types.uint(2)], deployer.address)
        ]);
        
        assertEquals(owner1Block.receipts[0].result.expectOk().expectSome(), wallet1.address);
        assertEquals(owner2Block.receipts[0].result.expectOk().expectSome(), wallet2.address);
    },
});

Clarinet.test({
    name: "SIP-090 NFT: Balance tracking works correctly",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // Initial balance should be 0
        let initialBalanceBlock = chain.mineBlock([
            Tx.contractCall('sip090-nft', 'get-balance', [types.principal(wallet1.address)], deployer.address)
        ]);
        assertEquals(initialBalanceBlock.receipts[0].result.expectOk(), types.uint(0));
        
        // Mint two tokens
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
        
        // Balance should now be 2
        let balanceBlock = chain.mineBlock([
            Tx.contractCall('sip090-nft', 'get-balance', [types.principal(wallet1.address)], deployer.address)
        ]);
        assertEquals(balanceBlock.receipts[0].result.expectOk(), types.uint(2));
    },
});