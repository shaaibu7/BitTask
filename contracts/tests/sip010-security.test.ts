import { describe, expect, it } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const alice = accounts.get('wallet_1')!;
const bob = accounts.get('wallet_2')!;
const charlie = accounts.get('wallet_3')!;

describe('SIP-010 Token - Security Tests', () => {
  it('should prevent unauthorized token transfers', () => {
    const transferAmount = 1000;
    
    // Alice tries to transfer Bob's tokens without permission
    const unauthorizedTransfer = simnet.callPublicFn(
      'sip010-token', 
      'transfer', 
      [Cl.uint(transferAmount), Cl.principal(bob), Cl.principal(alice), Cl.none()], 
      alice
    );
    
    expect(unauthorizedTransfer.result).toBeErr(Cl.uint(101)); // ERR-NOT-TOKEN-OWNER
    
    // Verify Bob's balance unchanged
    const bobBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(bob)], deployer);
    expect(bobBalance.result).toBeOk(Cl.uint(0));
  });

  it('should prevent double spending through allowances', () => {
    const approveAmount = 1000;
    const transferAmount = 600;
    
    // Deployer approves Alice to spend tokens
    simnet.callPublicFn('sip010-token', 'approve', [Cl.principal(alice), Cl.uint(approveAmount)], deployer);
    
    // Alice transfers some tokens using allowance
    simnet.callPublicFn('sip010-token', 'transfer-from', [Cl.uint(transferAmount), Cl.principal(deployer), Cl.principal(bob), Cl.none()], alice);
    
    // Alice tries to transfer more than remaining allowance
    const excessTransfer = simnet.callPublicFn(
      'sip010-token', 
      'transfer-from', 
      [Cl.uint(transferAmount), Cl.principal(deployer), Cl.principal(charlie), Cl.none()], 
      alice
    );
    
    expect(excessTransfer.result).toBeErr(Cl.uint(2)); // ERR-INSUFFICIENT-ALLOWANCE
    
    // Verify remaining allowance is correct
    const remainingAllowance = simnet.callReadOnlyFn(
      'sip010-token', 
      'get-allowance', 
      [Cl.principal(deployer), Cl.principal(alice)], 
      deployer
    );
    expect(remainingAllowance.result).toBeOk(Cl.uint(approveAmount - transferAmount));
  });

  it('should prevent unauthorized minting', () => {
    const mintAmount = 10000;
    
    // Alice tries to mint tokens (not owner)
    const unauthorizedMint = simnet.callPublicFn(
      'sip010-token', 
      'mint', 
      [Cl.uint(mintAmount), Cl.principal(alice)], 
      alice
    );
    
    expect(unauthorizedMint.result).toBeErr(Cl.uint(100)); // ERR-OWNER-ONLY
    
    // Verify Alice's balance is still zero
    const aliceBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(alice)], deployer);
    expect(aliceBalance.result).toBeOk(Cl.uint(0));
    
    // Verify total supply unchanged
    const totalSupply = simnet.callReadOnlyFn('sip010-token', 'get-total-supply', [], deployer);
    expect(totalSupply.result).toBeOk(Cl.uint(1000000000000));
  });

  it('should prevent unauthorized ownership transfer', () => {
    // Alice tries to transfer ownership to herself
    const unauthorizedOwnershipTransfer = simnet.callPublicFn(
      'sip010-token', 
      'set-contract-owner', 
      [Cl.principal(alice)], 
      alice
    );
    
    expect(unauthorizedOwnershipTransfer.result).toBeErr(Cl.uint(100)); // ERR-OWNER-ONLY
    
    // Verify owner is still deployer
    const currentOwner = simnet.callReadOnlyFn('sip010-token', 'get-contract-owner', [], deployer);
    expect(currentOwner.result).toBePrincipal(deployer);
  });

  it('should prevent unauthorized URI changes', () => {
    const maliciousUri = "https://malicious.com/fake-metadata.json";
    
    // Alice tries to set token URI
    const unauthorizedUriChange = simnet.callPublicFn(
      'sip010-token', 
      'set-token-uri', 
      [Cl.some(Cl.stringUtf8(maliciousUri))], 
      alice
    );
    
    expect(unauthorizedUriChange.result).toBeErr(Cl.uint(100)); // ERR-OWNER-ONLY
    
    // Verify URI is still none
    const currentUri = simnet.callPublicFn('sip010-token', 'get-token-uri', [], deployer);
    expect(currentUri.result).toBeOk(Cl.none());
  });

  it('should prevent overflow attacks', () => {
    const maxUint = 340282366920938463463374607431768211455n; // u128 max
    
    // Try to transfer maximum uint (should fail due to insufficient balance)
    const overflowTransfer = simnet.callPublicFn(
      'sip010-token', 
      'transfer', 
      [Cl.uint(maxUint), Cl.principal(deployer), Cl.principal(alice), Cl.none()], 
      deployer
    );
    
    expect(overflowTransfer.result).toBeErr(Cl.uint(1)); // ERR-INSUFFICIENT-BALANCE
    
    // Try to approve maximum uint (should succeed but be safe)
    const maxApproval = simnet.callPublicFn(
      'sip010-token', 
      'approve', 
      [Cl.principal(alice), Cl.uint(maxUint)], 
      deployer
    );
    
    expect(maxApproval.result).toBeOk(Cl.bool(true));
    
    // But transfer should still fail due to insufficient balance
    const transferWithMaxApproval = simnet.callPublicFn(
      'sip010-token', 
      'transfer-from', 
      [Cl.uint(maxUint), Cl.principal(deployer), Cl.principal(bob), Cl.none()], 
      alice
    );
    
    expect(transferWithMaxApproval.result).toBeErr(Cl.uint(1)); // ERR-INSUFFICIENT-BALANCE
  });

  it('should maintain state consistency under attack scenarios', () => {
    const initialSupply = 1000000000000;
    const transferAmount = 5000;
    
    // Record initial state
    const initialDeployerBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(deployer)], deployer);
    const initialTotalSupply = simnet.callReadOnlyFn('sip010-token', 'get-total-supply', [], deployer);
    
    // Attempt various unauthorized operations
    simnet.callPublicFn('sip010-token', 'transfer', [Cl.uint(transferAmount), Cl.principal(deployer), Cl.principal(alice), Cl.none()], alice);
    simnet.callPublicFn('sip010-token', 'mint', [Cl.uint(transferAmount), Cl.principal(alice)], alice);
    simnet.callPublicFn('sip010-token', 'set-contract-owner', [Cl.principal(alice)], alice);
    
    // Verify state is unchanged after failed attacks
    const finalDeployerBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(deployer)], deployer);
    const finalTotalSupply = simnet.callReadOnlyFn('sip010-token', 'get-total-supply', [], deployer);
    const finalOwner = simnet.callReadOnlyFn('sip010-token', 'get-contract-owner', [], deployer);
    
    expect(finalDeployerBalance.result).toEqual(initialDeployerBalance.result);
    expect(finalTotalSupply.result).toEqual(initialTotalSupply.result);
    expect(finalOwner.result).toBePrincipal(deployer);
  });
});