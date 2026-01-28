import { describe, expect, it } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const alice = accounts.get('wallet_1')!;
const bob = accounts.get('wallet_2')!;

describe('SIP-010 Token - Error Handling', () => {
  it('should return correct error codes for unauthorized transfers', () => {
    const transferAmount = 1000;
    
    const transfer = simnet.callPublicFn(
      'sip010-token', 
      'transfer', 
      [Cl.uint(transferAmount), Cl.principal(deployer), Cl.principal(alice), Cl.none()], 
      alice // Alice trying to transfer deployer's tokens
    );
    
    expect(transfer.result).toBeErr(Cl.uint(101)); // ERR-NOT-TOKEN-OWNER
  });

  it('should return correct error codes for insufficient balance', () => {
    const transferAmount = 999999999999999; // More than total supply
    
    const transfer = simnet.callPublicFn(
      'sip010-token', 
      'transfer', 
      [Cl.uint(transferAmount), Cl.principal(deployer), Cl.principal(alice), Cl.none()], 
      deployer
    );
    
    expect(transfer.result).toBeErr(Cl.uint(1)); // ERR-INSUFFICIENT-BALANCE
  });

  it('should return correct error codes for insufficient allowance', () => {
    const approveAmount = 1000;
    const transferAmount = 2000;
    
    // Approve smaller amount
    simnet.callPublicFn('sip010-token', 'approve', [Cl.principal(alice), Cl.uint(approveAmount)], deployer);
    
    // Try to transfer more than allowed
    const transferFrom = simnet.callPublicFn(
      'sip010-token', 
      'transfer-from', 
      [Cl.uint(transferAmount), Cl.principal(deployer), Cl.principal(bob), Cl.none()], 
      alice
    );
    
    expect(transferFrom.result).toBeErr(Cl.uint(2)); // ERR-INSUFFICIENT-ALLOWANCE
  });

  it('should return correct error codes for owner-only functions', () => {
    const mintAmount = 10000;
    
    // Alice trying to mint (not owner)
    const mint = simnet.callPublicFn(
      'sip010-token', 
      'mint', 
      [Cl.uint(mintAmount), Cl.principal(alice)], 
      alice
    );
    
    expect(mint.result).toBeErr(Cl.uint(100)); // ERR-OWNER-ONLY
    
    // Alice trying to set URI (not owner)
    const setUri = simnet.callPublicFn(
      'sip010-token', 
      'set-token-uri', 
      [Cl.some(Cl.stringUtf8("https://example.com"))], 
      alice
    );
    
    expect(setUri.result).toBeErr(Cl.uint(100)); // ERR-OWNER-ONLY
    
    // Alice trying to transfer ownership (not owner)
    const setOwner = simnet.callPublicFn(
      'sip010-token', 
      'set-contract-owner', 
      [Cl.principal(bob)], 
      alice
    );
    
    expect(setOwner.result).toBeErr(Cl.uint(100)); // ERR-OWNER-ONLY
  });

  it('should return correct error codes for invalid mint amounts', () => {
    const mintAmount = 0;
    
    const mint = simnet.callPublicFn(
      'sip010-token', 
      'mint', 
      [Cl.uint(mintAmount), Cl.principal(alice)], 
      deployer
    );
    
    expect(mint.result).toBeErr(Cl.uint(103)); // ERR-INVALID-AMOUNT
  });

  it('should return correct error codes for burn with insufficient balance', () => {
    const burnAmount = 999999999999999; // More than Alice's balance
    
    const burn = simnet.callPublicFn('sip010-token', 'burn', [Cl.uint(burnAmount)], alice);
    
    expect(burn.result).toBeErr(Cl.uint(1)); // ERR-INSUFFICIENT-BALANCE
  });

  it('should handle multiple error conditions in sequence', () => {
    // 1. Unauthorized transfer
    let result = simnet.callPublicFn(
      'sip010-token', 
      'transfer', 
      [Cl.uint(1000), Cl.principal(deployer), Cl.principal(alice), Cl.none()], 
      alice
    );
    expect(result.result).toBeErr(Cl.uint(101)); // ERR-NOT-TOKEN-OWNER
    
    // 2. Insufficient allowance
    result = simnet.callPublicFn(
      'sip010-token', 
      'transfer-from', 
      [Cl.uint(1000), Cl.principal(deployer), Cl.principal(bob), Cl.none()], 
      alice
    );
    expect(result.result).toBeErr(Cl.uint(2)); // ERR-INSUFFICIENT-ALLOWANCE
    
    // 3. Owner-only function
    result = simnet.callPublicFn(
      'sip010-token', 
      'mint', 
      [Cl.uint(1000), Cl.principal(alice)], 
      alice
    );
    expect(result.result).toBeErr(Cl.uint(100)); // ERR-OWNER-ONLY
    
    // 4. Invalid amount
    result = simnet.callPublicFn(
      'sip010-token', 
      'mint', 
      [Cl.uint(0), Cl.principal(alice)], 
      deployer
    );
    expect(result.result).toBeErr(Cl.uint(103)); // ERR-INVALID-AMOUNT
  });
});