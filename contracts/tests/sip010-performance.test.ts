import { describe, expect, it } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const alice = accounts.get('wallet_1')!;

describe('SIP-010 Token - Performance Tests', () => {
  it('should execute transfers efficiently', () => {
    const transferAmount = 1000;
    const startTime = Date.now();
    
    for (let i = 0; i < 10; i++) {
      const transfer = simnet.callPublicFn(
        'sip010-token', 
        'transfer', 
        [Cl.uint(transferAmount), Cl.principal(deployer), Cl.principal(alice), Cl.none()], 
        deployer
      );
      expect(transfer.result).toBeOk(Cl.bool(true));
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should complete 10 transfers in reasonable time
    expect(duration).toBeLessThan(5000); // 5 seconds max
  });

  it('should handle rapid balance queries', () => {
    const startTime = Date.now();
    
    for (let i = 0; i < 50; i++) {
      const balance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(deployer)], deployer);
      expect(balance.result).toBeDefined();
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should complete 50 balance queries quickly
    expect(duration).toBeLessThan(2000); // 2 seconds max
  });

  it('should optimize allowance operations', () => {
    const approveAmount = 5000;
    const startTime = Date.now();
    
    // Rapid approve/check cycles
    for (let i = 0; i < 20; i++) {
      simnet.callPublicFn('sip010-token', 'approve', [Cl.principal(alice), Cl.uint(approveAmount + i)], deployer);
      const allowance = simnet.callReadOnlyFn('sip010-token', 'get-allowance', [Cl.principal(deployer), Cl.principal(alice)], deployer);
      expect(allowance.result).toBeOk(Cl.uint(approveAmount + i));
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(3000); // 3 seconds max
  });
});