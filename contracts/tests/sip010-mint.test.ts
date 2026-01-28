import { describe, expect, it } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const alice = accounts.get('wallet_1')!;
const bob = accounts.get('wallet_2')!;

describe('SIP-010 Token - Minting', () => {
  it('should mint tokens as contract owner', () => {
    const mintAmount = 10000;
    const initialSupply = 1000000000000;
    
    const mint = simnet.callPublicFn(
      'sip010-token', 
      'mint', 
      [Cl.uint(mintAmount), Cl.principal(alice)], 
      deployer
    );
    
    expect(mint.result).toBeOk(Cl.bool(true));
    
    const aliceBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(alice)], deployer);
    expect(aliceBalance.result).toBeOk(Cl.uint(mintAmount));
    
    const totalSupply = simnet.callReadOnlyFn('sip010-token', 'get-total-supply', [], deployer);
    expect(totalSupply.result).toBeOk(Cl.uint(initialSupply + mintAmount));
  });

  it('should fail mint when not contract owner', () => {
    const mintAmount = 10000;
    
    const mint = simnet.callPublicFn(
      'sip010-token', 
      'mint', 
      [Cl.uint(mintAmount), Cl.principal(alice)], 
      alice // Alice trying to mint
    );
    
    expect(mint.result).toBeErr(Cl.uint(100)); // ERR-OWNER-ONLY
  });

  it('should fail mint with zero amount', () => {
    const mintAmount = 0;
    
    const mint = simnet.callPublicFn(
      'sip010-token', 
      'mint', 
      [Cl.uint(mintAmount), Cl.principal(alice)], 
      deployer
    );
    
    expect(mint.result).toBeErr(Cl.uint(103)); // ERR-INVALID-AMOUNT
  });

  it('should mint to multiple recipients', () => {
    const mintAmount = 5000;
    
    // Mint to Alice
    simnet.callPublicFn('sip010-token', 'mint', [Cl.uint(mintAmount), Cl.principal(alice)], deployer);
    
    // Mint to Bob
    simnet.callPublicFn('sip010-token', 'mint', [Cl.uint(mintAmount), Cl.principal(bob)], deployer);
    
    const aliceBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(alice)], deployer);
    const bobBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(bob)], deployer);
    
    expect(aliceBalance.result).toBeOk(Cl.uint(mintAmount));
    expect(bobBalance.result).toBeOk(Cl.uint(mintAmount));
  });
});