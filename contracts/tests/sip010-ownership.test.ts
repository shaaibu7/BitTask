import { describe, expect, it } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const alice = accounts.get('wallet_1')!;
const bob = accounts.get('wallet_2')!;

describe('SIP-010 Token - Ownership Management', () => {
  it('should return correct initial contract owner', () => {
    const owner = simnet.callReadOnlyFn('sip010-token', 'get-contract-owner', [], deployer);
    expect(owner.result).toBePrincipal(deployer);
  });

  it('should transfer contract ownership', () => {
    const setOwner = simnet.callPublicFn(
      'sip010-token', 
      'set-contract-owner', 
      [Cl.principal(alice)], 
      deployer
    );
    
    expect(setOwner.result).toBeOk(Cl.bool(true));
    
    const newOwner = simnet.callReadOnlyFn('sip010-token', 'get-contract-owner', [], deployer);
    expect(newOwner.result).toBePrincipal(alice);
  });

  it('should fail ownership transfer when not owner', () => {
    const setOwner = simnet.callPublicFn(
      'sip010-token', 
      'set-contract-owner', 
      [Cl.principal(bob)], 
      alice // Alice trying to transfer ownership (but she's not owner)
    );
    
    expect(setOwner.result).toBeErr(Cl.uint(100)); // ERR-OWNER-ONLY
  });

  it('should allow new owner to mint tokens', () => {
    // First transfer ownership to Alice
    simnet.callPublicFn('sip010-token', 'set-contract-owner', [Cl.principal(alice)], deployer);
    
    // Alice should now be able to mint
    const mintAmount = 5000;
    const mint = simnet.callPublicFn(
      'sip010-token', 
      'mint', 
      [Cl.uint(mintAmount), Cl.principal(bob)], 
      alice
    );
    
    expect(mint.result).toBeOk(Cl.bool(true));
    
    const bobBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(bob)], deployer);
    expect(bobBalance.result).toBeOk(Cl.uint(mintAmount));
  });

  it('should prevent old owner from minting after ownership transfer', () => {
    // Transfer ownership to Alice
    simnet.callPublicFn('sip010-token', 'set-contract-owner', [Cl.principal(alice)], deployer);
    
    // Deployer should no longer be able to mint
    const mintAmount = 5000;
    const mint = simnet.callPublicFn(
      'sip010-token', 
      'mint', 
      [Cl.uint(mintAmount), Cl.principal(bob)], 
      deployer
    );
    
    expect(mint.result).toBeErr(Cl.uint(100)); // ERR-OWNER-ONLY
  });
});