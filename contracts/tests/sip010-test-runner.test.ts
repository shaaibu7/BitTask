import { describe, expect, it } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;

describe('SIP-010 Token - Test Runner Validation', () => {
  it('should validate test environment setup', () => {
    // Verify simnet is properly initialized
    expect(simnet).toBeDefined();
    expect(accounts).toBeDefined();
    expect(deployer).toBeDefined();
    
    // Verify contract is deployed
    const name = simnet.callReadOnlyFn('sip010-token', 'get-name', [], deployer);
    expect(name.result).toBeOk(Cl.stringAscii('BitToken'));
  });

  it('should validate all test accounts are available', () => {
    const requiredAccounts = ['deployer', 'wallet_1', 'wallet_2', 'wallet_3'];
    
    for (const accountName of requiredAccounts) {
      const account = accounts.get(accountName);
      expect(account).toBeDefined();
      expect(typeof account).toBe('string');
    }
  });

  it('should validate contract functions are accessible', () => {
    const functions = [
      'get-name', 'get-symbol', 'get-decimals', 'get-total-supply', 'get-balance',
      'transfer', 'approve', 'get-allowance', 'transfer-from',
      'mint', 'burn', 'set-contract-owner', 'get-contract-owner',
      'get-token-uri', 'set-token-uri'
    ];
    
    // Test that all functions exist by calling read-only ones
    const readOnlyFunctions = ['get-name', 'get-symbol', 'get-decimals', 'get-total-supply', 'get-contract-owner', 'get-token-uri'];
    
    for (const func of readOnlyFunctions) {
      const result = simnet.callReadOnlyFn('sip010-token', func, [], deployer);
      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
    }
  });

  it('should validate initial contract state', () => {
    const name = simnet.callReadOnlyFn('sip010-token', 'get-name', [], deployer);
    const symbol = simnet.callReadOnlyFn('sip010-token', 'get-symbol', [], deployer);
    const decimals = simnet.callReadOnlyFn('sip010-token', 'get-decimals', [], deployer);
    const totalSupply = simnet.callReadOnlyFn('sip010-token', 'get-total-supply', [], deployer);
    const deployerBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(deployer)], deployer);
    const owner = simnet.callReadOnlyFn('sip010-token', 'get-contract-owner', [], deployer);
    const uri = simnet.callPublicFn('sip010-token', 'get-token-uri', [], deployer);
    
    expect(name.result).toBeOk(Cl.stringAscii('BitToken'));
    expect(symbol.result).toBeOk(Cl.stringAscii('BTK'));
    expect(decimals.result).toBeOk(Cl.uint(6));
    expect(totalSupply.result).toBeOk(Cl.uint(1000000000000));
    expect(deployerBalance.result).toBeOk(Cl.uint(1000000000000));
    expect(owner.result).toBePrincipal(deployer);
    expect(uri.result).toBeOk(Cl.none());
  });
});