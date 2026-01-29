import { describe, expect, it } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const alice = accounts.get('wallet_1')!;
const bob = accounts.get('wallet_2')!;

describe('SIP-010 Token - Gas Optimization', () => {
  it('should use minimal gas for basic operations', () => {
    // Test transfer gas usage
    const transferResult = simnet.callPublicFn(
      'sip010-token', 
      'transfer', 
      [Cl.uint(1000), Cl.principal(deployer), Cl.principal(alice), Cl.none()], 
      deployer
    );
    
    expect(transferResult.result).toBeOk(Cl.bool(true));
    // Gas usage should be reasonable (exact values depend on implementation)
    expect(transferResult.cost).toBeLessThan(10000);
  });

  it('should use minimal gas for approval operations', () => {
    const approveResult = simnet.callPublicFn(
      'sip010-token', 
      'approve', 
      [Cl.principal(alice), Cl.uint(5000)], 
      deployer
    );
    
    expect(approveResult.result).toBeOk(Cl.bool(true));
    expect(approveResult.cost).toBeLessThan(5000);
  });

  it('should use minimal gas for read-only operations', () => {
    const balanceResult = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(deployer)], deployer);
    const supplyResult = simnet.callReadOnlyFn('sip010-token', 'get-total-supply', [], deployer);
    const allowanceResult = simnet.callReadOnlyFn('sip010-token', 'get-allowance', [Cl.principal(deployer), Cl.principal(alice)], deployer);
    
    expect(balanceResult.result).toBeOk(Cl.uint(1000000000000));
    expect(supplyResult.result).toBeOk(Cl.uint(1000000000000));
    expect(allowanceResult.result).toBeOk(Cl.uint(0));
    
    // Read-only operations should have minimal cost
    expect(balanceResult.cost).toBeLessThan(1000);
    expect(supplyResult.cost).toBeLessThan(1000);
    expect(allowanceResult.cost).toBeLessThan(1000);
  });

  it('should optimize batch operations', () => {
    const transferAmount = 1000;
    
    // Multiple transfers should not exponentially increase gas
    const transfer1 = simnet.callPublicFn(
      'sip010-token', 
      'transfer', 
      [Cl.uint(transferAmount), Cl.principal(deployer), Cl.principal(alice), Cl.none()], 
      deployer
    );
    
    const transfer2 = simnet.callPublicFn(
      'sip010-token', 
      'transfer', 
      [Cl.uint(transferAmount), Cl.principal(deployer), Cl.principal(bob), Cl.none()], 
      deployer
    );
    
    expect(transfer1.result).toBeOk(Cl.bool(true));
    expect(transfer2.result).toBeOk(Cl.bool(true));
    
    // Second transfer should have similar gas cost
    const gasDifference = Math.abs(transfer2.cost - transfer1.cost);
    expect(gasDifference).toBeLessThan(1000); // Should be minimal difference
  });

  it('should optimize allowance updates', () => {
    const approveAmount1 = 1000;
    const approveAmount2 = 2000;
    
    // First approval
    const approve1 = simnet.callPublicFn(
      'sip010-token', 
      'approve', 
      [Cl.principal(alice), Cl.uint(approveAmount1)], 
      deployer
    );
    
    // Update approval
    const approve2 = simnet.callPublicFn(
      'sip010-token', 
      'approve', 
      [Cl.principal(alice), Cl.uint(approveAmount2)], 
      deployer
    );
    
    expect(approve1.result).toBeOk(Cl.bool(true));
    expect(approve2.result).toBeOk(Cl.bool(true));
    
    // Updating existing approval should have similar cost
    const gasDifference = Math.abs(approve2.cost - approve1.cost);
    expect(gasDifference).toBeLessThan(500);
  });

  it('should handle zero-amount operations efficiently', () => {
    // Zero transfers should be very cheap
    const zeroTransfer = simnet.callPublicFn(
      'sip010-token', 
      'transfer', 
      [Cl.uint(0), Cl.principal(deployer), Cl.principal(alice), Cl.none()], 
      deployer
    );
    
    // Zero approval should be very cheap
    const zeroApprove = simnet.callPublicFn(
      'sip010-token', 
      'approve', 
      [Cl.principal(alice), Cl.uint(0)], 
      deployer
    );
    
    // Zero burn should be very cheap
    const zeroBurn = simnet.callPublicFn('sip010-token', 'burn', [Cl.uint(0)], deployer);
    
    expect(zeroTransfer.result).toBeOk(Cl.bool(true));
    expect(zeroApprove.result).toBeOk(Cl.bool(true));
    expect(zeroBurn.result).toBeOk(Cl.bool(true));
    
    // Zero operations should be cheaper than regular operations
    expect(zeroTransfer.cost).toBeLessThan(5000);
    expect(zeroApprove.cost).toBeLessThan(3000);
    expect(zeroBurn.cost).toBeLessThan(3000);
  });
});