import { describe, expect, it } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const alice = accounts.get('wallet_1')!;
const bob = accounts.get('wallet_2')!;

describe('SIP-010 Token - Edge Cases', () => {
  it('should handle zero amount transfers', () => {
    const transfer = simnet.callPublicFn(
      'sip010-token', 
      'transfer', 
      [Cl.uint(0), Cl.principal(deployer), Cl.principal(alice), Cl.none()], 
      deployer
    );
    
    expect(transfer.result).toBeOk(Cl.bool(true));
    
    const aliceBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(alice)], deployer);
    expect(aliceBalance.result).toBeOk(Cl.uint(0));
  });

  it('should handle zero amount approvals', () => {
    const approve = simnet.callPublicFn(
      'sip010-token', 
      'approve', 
      [Cl.principal(alice), Cl.uint(0)], 
      deployer
    );
    
    expect(approve.result).toBeOk(Cl.bool(true));
    
    const allowance = simnet.callReadOnlyFn(
      'sip010-token', 
      'get-allowance', 
      [Cl.principal(deployer), Cl.principal(alice)], 
      deployer
    );
    
    expect(allowance.result).toBeOk(Cl.uint(0));
  });

  it('should handle self-transfers', () => {
    const transferAmount = 1000;
    
    const transfer = simnet.callPublicFn(
      'sip010-token', 
      'transfer', 
      [Cl.uint(transferAmount), Cl.principal(deployer), Cl.principal(deployer), Cl.none()], 
      deployer
    );
    
    expect(transfer.result).toBeOk(Cl.bool(true));
    
    // Balance should remain the same
    const deployerBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(deployer)], deployer);
    expect(deployerBalance.result).toBeOk(Cl.uint(1000000000000)); // Initial supply
  });

  it('should handle self-approval', () => {
    const approveAmount = 5000;
    
    const approve = simnet.callPublicFn(
      'sip010-token', 
      'approve', 
      [Cl.principal(deployer), Cl.uint(approveAmount)], 
      deployer
    );
    
    expect(approve.result).toBeOk(Cl.bool(true));
    
    const allowance = simnet.callReadOnlyFn(
      'sip010-token', 
      'get-allowance', 
      [Cl.principal(deployer), Cl.principal(deployer)], 
      deployer
    );
    
    expect(allowance.result).toBeOk(Cl.uint(approveAmount));
  });

  it('should handle maximum uint values', () => {
    const maxUint = 340282366920938463463374607431768211455n; // u128 max
    
    // This should fail due to insufficient balance
    const transfer = simnet.callPublicFn(
      'sip010-token', 
      'transfer', 
      [Cl.uint(maxUint), Cl.principal(deployer), Cl.principal(alice), Cl.none()], 
      deployer
    );
    
    expect(transfer.result).toBeErr(Cl.uint(1)); // ERR-INSUFFICIENT-BALANCE
  });
});