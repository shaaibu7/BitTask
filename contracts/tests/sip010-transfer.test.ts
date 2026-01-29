import { describe, expect, it } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const alice = accounts.get('wallet_1')!;
const bob = accounts.get('wallet_2')!;

describe('SIP-010 Token - Transfer Functions', () => {
  it('should transfer tokens successfully', () => {
    const transferAmount = 1000;
    
    const transfer = simnet.callPublicFn(
      'sip010-token', 
      'transfer', 
      [Cl.uint(transferAmount), Cl.principal(deployer), Cl.principal(alice), Cl.none()], 
      deployer
    );
    
    expect(transfer.result).toBeOk(Cl.bool(true));
    
    const aliceBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(alice)], deployer);
    expect(aliceBalance.result).toBeOk(Cl.uint(transferAmount));
  });

  it('should fail transfer when unauthorized', () => {
    const transferAmount = 1000;
    
    const transfer = simnet.callPublicFn(
      'sip010-token', 
      'transfer', 
      [Cl.uint(transferAmount), Cl.principal(deployer), Cl.principal(alice), Cl.none()], 
      alice // Alice trying to transfer deployer's tokens
    );
    
    expect(transfer.result).toBeErr(Cl.uint(101)); // ERR-NOT-TOKEN-OWNER
  });

  it('should fail transfer with insufficient balance', () => {
    const transferAmount = 999999999999999; // More than total supply
    
    const transfer = simnet.callPublicFn(
      'sip010-token', 
      'transfer', 
      [Cl.uint(transferAmount), Cl.principal(deployer), Cl.principal(alice), Cl.none()], 
      deployer
    );
    
    expect(transfer.result).toBeErr(Cl.uint(1)); // ERR-INSUFFICIENT-BALANCE
  });

  it('should handle transfer with memo', () => {
    const transferAmount = 2000;
    const memo = "Test transfer with memo";
    
    const transfer = simnet.callPublicFn(
      'sip010-token', 
      'transfer', 
      [Cl.uint(transferAmount), Cl.principal(deployer), Cl.principal(alice), Cl.some(Cl.bufferFromAscii(memo))], 
      deployer
    );
    
    expect(transfer.result).toBeOk(Cl.bool(true));
    
    const aliceBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(alice)], deployer);
    expect(aliceBalance.result).toBeOk(Cl.uint(transferAmount));
  });
});