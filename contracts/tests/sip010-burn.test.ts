import { describe, expect, it } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const alice = accounts.get('wallet_1')!;

describe('SIP-010 Token - Burning', () => {
  it('should burn tokens successfully', () => {
    const transferAmount = 5000;
    const burnAmount = 2000;
    const initialSupply = 1000000000000;
    
    // First transfer some tokens to alice
    simnet.callPublicFn('sip010-token', 'transfer', [Cl.uint(transferAmount), Cl.principal(deployer), Cl.principal(alice), Cl.none()], deployer);
    
    // Alice burns some tokens
    const burn = simnet.callPublicFn('sip010-token', 'burn', [Cl.uint(burnAmount)], alice);
    
    expect(burn.result).toBeOk(Cl.bool(true));
    
    const aliceBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(alice)], deployer);
    expect(aliceBalance.result).toBeOk(Cl.uint(transferAmount - burnAmount));
    
    const totalSupply = simnet.callReadOnlyFn('sip010-token', 'get-total-supply', [], deployer);
    expect(totalSupply.result).toBeOk(Cl.uint(initialSupply - burnAmount));
  });

  it('should fail burn with insufficient balance', () => {
    const burnAmount = 999999999999999; // More than balance
    
    const burn = simnet.callPublicFn('sip010-token', 'burn', [Cl.uint(burnAmount)], alice);
    
    expect(burn.result).toBeErr(Cl.uint(1)); // ERR-INSUFFICIENT-BALANCE
  });

  it('should allow burning zero tokens', () => {
    const burnAmount = 0;
    
    const burn = simnet.callPublicFn('sip010-token', 'burn', [Cl.uint(burnAmount)], alice);
    
    expect(burn.result).toBeOk(Cl.bool(true));
  });

  it('should burn entire balance', () => {
    const transferAmount = 1000;
    
    // Transfer tokens to alice
    simnet.callPublicFn('sip010-token', 'transfer', [Cl.uint(transferAmount), Cl.principal(deployer), Cl.principal(alice), Cl.none()], deployer);
    
    // Burn entire balance
    const burn = simnet.callPublicFn('sip010-token', 'burn', [Cl.uint(transferAmount)], alice);
    
    expect(burn.result).toBeOk(Cl.bool(true));
    
    const aliceBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(alice)], deployer);
    expect(aliceBalance.result).toBeOk(Cl.uint(0));
  });
});