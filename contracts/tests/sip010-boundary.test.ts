import { describe, expect, it } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const alice = accounts.get('wallet_1')!;

describe('SIP-010 Token - Boundary Value Tests', () => {
  it('should handle minimum transfer amounts', () => {
    const minTransfer = 1;
    
    const transfer = simnet.callPublicFn(
      'sip010-token', 
      'transfer', 
      [Cl.uint(minTransfer), Cl.principal(deployer), Cl.principal(alice), Cl.none()], 
      deployer
    );
    
    expect(transfer.result).toBeOk(Cl.bool(true));
    
    const aliceBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(alice)], deployer);
    expect(aliceBalance.result).toBeOk(Cl.uint(minTransfer));
  });

  it('should handle maximum possible transfer', () => {
    const maxTransfer = 1000000000000; // Total supply
    
    const transfer = simnet.callPublicFn(
      'sip010-token', 
      'transfer', 
      [Cl.uint(maxTransfer), Cl.principal(deployer), Cl.principal(alice), Cl.none()], 
      deployer
    );
    
    expect(transfer.result).toBeOk(Cl.bool(true));
    
    const deployerBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(deployer)], deployer);
    const aliceBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(alice)], deployer);
    
    expect(deployerBalance.result).toBeOk(Cl.uint(0));
    expect(aliceBalance.result).toBeOk(Cl.uint(maxTransfer));
  });

  it('should handle boundary approval amounts', () => {
    const maxUint = 340282366920938463463374607431768211455n; // u128 max
    
    const approve = simnet.callPublicFn(
      'sip010-token', 
      'approve', 
      [Cl.principal(alice), Cl.uint(maxUint)], 
      deployer
    );
    
    expect(approve.result).toBeOk(Cl.bool(true));
    
    const allowance = simnet.callReadOnlyFn(
      'sip010-token', 
      'get-allowance', 
      [Cl.principal(deployer), Cl.principal(alice)], 
      deployer
    );
    
    expect(allowance.result).toBeOk(Cl.uint(maxUint));
  });

  it('should handle minimum mint amounts', () => {
    const minMint = 1;
    
    const mint = simnet.callPublicFn(
      'sip010-token', 
      'mint', 
      [Cl.uint(minMint), Cl.principal(alice)], 
      deployer
    );
    
    expect(mint.result).toBeOk(Cl.bool(true));
    
    const aliceBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(alice)], deployer);
    expect(aliceBalance.result).toBeOk(Cl.uint(minMint));
  });

  it('should handle large mint amounts', () => {
    const largeMint = 999999999999; // Large but reasonable amount
    
    const mint = simnet.callPublicFn(
      'sip010-token', 
      'mint', 
      [Cl.uint(largeMint), Cl.principal(alice)], 
      deployer
    );
    
    expect(mint.result).toBeOk(Cl.bool(true));
    
    const totalSupply = simnet.callReadOnlyFn('sip010-token', 'get-total-supply', [], deployer);
    expect(totalSupply.result).toBeOk(Cl.uint(1000000000000 + largeMint));
  });
});