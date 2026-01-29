import { describe, expect, it } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const alice = accounts.get('wallet_1')!;
const bob = accounts.get('wallet_2')!;

describe('SIP-010 Token - Transfer From', () => {
  it('should transfer-from with valid allowance', () => {
    const approveAmount = 5000;
    const transferAmount = 2000;
    
    // First approve
    simnet.callPublicFn('sip010-token', 'approve', [Cl.principal(alice), Cl.uint(approveAmount)], deployer);
    
    // Then transfer-from
    const transferFrom = simnet.callPublicFn(
      'sip010-token', 
      'transfer-from', 
      [Cl.uint(transferAmount), Cl.principal(deployer), Cl.principal(bob), Cl.none()], 
      alice
    );
    
    expect(transferFrom.result).toBeOk(Cl.bool(true));
    
    const bobBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(bob)], deployer);
    expect(bobBalance.result).toBeOk(Cl.uint(transferAmount));
    
    const remainingAllowance = simnet.callReadOnlyFn(
      'sip010-token', 
      'get-allowance', 
      [Cl.principal(deployer), Cl.principal(alice)], 
      deployer
    );
    expect(remainingAllowance.result).toBeOk(Cl.uint(approveAmount - transferAmount));
  });

  it('should fail transfer-from with insufficient allowance', () => {
    const approveAmount = 1000;
    const transferAmount = 2000;
    
    // First approve smaller amount
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

  it('should fail transfer-from with zero allowance', () => {
    const transferAmount = 1000;
    
    const transferFrom = simnet.callPublicFn(
      'sip010-token', 
      'transfer-from', 
      [Cl.uint(transferAmount), Cl.principal(deployer), Cl.principal(bob), Cl.none()], 
      alice
    );
    
    expect(transferFrom.result).toBeErr(Cl.uint(2)); // ERR-INSUFFICIENT-ALLOWANCE
  });
});