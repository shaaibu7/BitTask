import { describe, expect, it } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const alice = accounts.get('wallet_1')!;
const bob = accounts.get('wallet_2')!;
const charlie = accounts.get('wallet_3')!;

describe('SIP-010 Token - Integration Tests', () => {
  it('should handle complex multi-user scenario', () => {
    const mintAmount = 10000;
    const transferAmount = 3000;
    const approveAmount = 5000;
    const transferFromAmount = 2000;
    const burnAmount = 1000;
    
    // 1. Mint tokens to Alice
    simnet.callPublicFn('sip010-token', 'mint', [Cl.uint(mintAmount), Cl.principal(alice)], deployer);
    
    // 2. Alice transfers some to Bob
    simnet.callPublicFn('sip010-token', 'transfer', [Cl.uint(transferAmount), Cl.principal(alice), Cl.principal(bob), Cl.none()], alice);
    
    // 3. Alice approves Charlie to spend her tokens
    simnet.callPublicFn('sip010-token', 'approve', [Cl.principal(charlie), Cl.uint(approveAmount)], alice);
    
    // 4. Charlie transfers from Alice to Bob
    simnet.callPublicFn('sip010-token', 'transfer-from', [Cl.uint(transferFromAmount), Cl.principal(alice), Cl.principal(bob), Cl.none()], charlie);
    
    // 5. Bob burns some tokens
    simnet.callPublicFn('sip010-token', 'burn', [Cl.uint(burnAmount)], bob);
    
    // Verify final balances
    const aliceBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(alice)], deployer);
    const bobBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(bob)], deployer);
    const charlieBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(charlie)], deployer);
    
    expect(aliceBalance.result).toBeOk(Cl.uint(mintAmount - transferAmount - transferFromAmount)); // 5000
    expect(bobBalance.result).toBeOk(Cl.uint(transferAmount + transferFromAmount - burnAmount)); // 4000
    expect(charlieBalance.result).toBeOk(Cl.uint(0));
    
    // Verify remaining allowance
    const remainingAllowance = simnet.callReadOnlyFn(
      'sip010-token', 
      'get-allowance', 
      [Cl.principal(alice), Cl.principal(charlie)], 
      deployer
    );
    expect(remainingAllowance.result).toBeOk(Cl.uint(approveAmount - transferFromAmount)); // 3000
  });

  it('should maintain total supply consistency', () => {
    const initialSupply = 1000000000000;
    const mintAmount = 50000;
    const burnAmount = 20000;
    
    // Get initial supply
    const initialTotalSupply = simnet.callReadOnlyFn('sip010-token', 'get-total-supply', [], deployer);
    expect(initialTotalSupply.result).toBeOk(Cl.uint(initialSupply));
    
    // Mint tokens
    simnet.callPublicFn('sip010-token', 'mint', [Cl.uint(mintAmount), Cl.principal(alice)], deployer);
    
    const afterMintSupply = simnet.callReadOnlyFn('sip010-token', 'get-total-supply', [], deployer);
    expect(afterMintSupply.result).toBeOk(Cl.uint(initialSupply + mintAmount));
    
    // Burn tokens
    simnet.callPublicFn('sip010-token', 'burn', [Cl.uint(burnAmount)], alice);
    
    const afterBurnSupply = simnet.callReadOnlyFn('sip010-token', 'get-total-supply', [], deployer);
    expect(afterBurnSupply.result).toBeOk(Cl.uint(initialSupply + mintAmount - burnAmount));
  });

  it('should handle ownership transfer with subsequent operations', () => {
    const mintAmount = 15000;
    
    // Transfer ownership to Alice
    simnet.callPublicFn('sip010-token', 'set-contract-owner', [Cl.principal(alice)], deployer);
    
    // Alice mints tokens to Bob
    const mint = simnet.callPublicFn('sip010-token', 'mint', [Cl.uint(mintAmount), Cl.principal(bob)], alice);
    expect(mint.result).toBeOk(Cl.bool(true));
    
    // Alice sets token URI
    const newUri = "https://alice.com/token-metadata.json";
    const setUri = simnet.callPublicFn('sip010-token', 'set-token-uri', [Cl.some(Cl.stringUtf8(newUri))], alice);
    expect(setUri.result).toBeOk(Cl.bool(true));
    
    // Verify Bob's balance
    const bobBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(bob)], deployer);
    expect(bobBalance.result).toBeOk(Cl.uint(mintAmount));
    
    // Verify URI was set
    const uri = simnet.callPublicFn('sip010-token', 'get-token-uri', [], deployer);
    expect(uri.result).toBeOk(Cl.some(Cl.stringUtf8(newUri)));
  });
});