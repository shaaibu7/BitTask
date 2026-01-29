import { describe, expect, it, beforeEach } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const alice = accounts.get('wallet_1')!;
const bob = accounts.get('wallet_2')!;
const charlie = accounts.get('wallet_3')!;

describe('SIP-010 Token - Basic Functionality', () => {
  it('should have correct token metadata', () => {
    const name = simnet.callReadOnlyFn('sip010-token', 'get-name', [], deployer);
    const symbol = simnet.callReadOnlyFn('sip010-token', 'get-symbol', [], deployer);
    const decimals = simnet.callReadOnlyFn('sip010-token', 'get-decimals', [], deployer);
    
    expect(name.result).toBeOk(Cl.stringAscii('BitToken'));
    expect(symbol.result).toBeOk(Cl.stringAscii('BTK'));
    expect(decimals.result).toBeOk(Cl.uint(6));
  });

  it('should have correct initial supply', () => {
    const totalSupply = simnet.callReadOnlyFn('sip010-token', 'get-total-supply', [], deployer);
    const deployerBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(deployer)], deployer);
    
    expect(totalSupply.result).toBeOk(Cl.uint(1000000000000));
    expect(deployerBalance.result).toBeOk(Cl.uint(1000000000000));
  });

  it('should return zero balance for new accounts', () => {
    const aliceBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(alice)], deployer);
    expect(aliceBalance.result).toBeOk(Cl.uint(0));
  });

  it('should have consistent metadata across calls', () => {
    // Call metadata functions multiple times to ensure consistency
    for (let i = 0; i < 5; i++) {
      const name = simnet.callReadOnlyFn('sip010-token', 'get-name', [], deployer);
      const symbol = simnet.callReadOnlyFn('sip010-token', 'get-symbol', [], deployer);
      const decimals = simnet.callReadOnlyFn('sip010-token', 'get-decimals', [], deployer);
      
      expect(name.result).toBeOk(Cl.stringAscii('BitToken'));
      expect(symbol.result).toBeOk(Cl.stringAscii('BTK'));
      expect(decimals.result).toBeOk(Cl.uint(6));
    }
  });
});