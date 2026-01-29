import { describe, expect, it } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const alice = accounts.get('wallet_1')!;

describe('SIP-010 Token - SIP-010 Compliance', () => {
  it('should implement all required SIP-010 functions', () => {
    // Test get-name
    const name = simnet.callReadOnlyFn('sip010-token', 'get-name', [], deployer);
    expect(name.result).toBeOk(Cl.stringAscii('BitToken'));
    
    // Test get-symbol
    const symbol = simnet.callReadOnlyFn('sip010-token', 'get-symbol', [], deployer);
    expect(symbol.result).toBeOk(Cl.stringAscii('BTK'));
    
    // Test get-decimals
    const decimals = simnet.callReadOnlyFn('sip010-token', 'get-decimals', [], deployer);
    expect(decimals.result).toBeOk(Cl.uint(6));
    
    // Test get-total-supply
    const totalSupply = simnet.callReadOnlyFn('sip010-token', 'get-total-supply', [], deployer);
    expect(totalSupply.result).toBeOk(Cl.uint(1000000000000));
    
    // Test get-balance
    const balance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(deployer)], deployer);
    expect(balance.result).toBeOk(Cl.uint(1000000000000));
  });

  it('should implement transfer function correctly', () => {
    const transferAmount = 1000;
    
    const transfer = simnet.callPublicFn(
      'sip010-token', 
      'transfer', 
      [Cl.uint(transferAmount), Cl.principal(deployer), Cl.principal(alice), Cl.none()], 
      deployer
    );
    
    expect(transfer.result).toBeOk(Cl.bool(true));
    
    // Verify balances changed correctly
    const deployerBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(deployer)], deployer);
    const aliceBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(alice)], deployer);
    
    expect(deployerBalance.result).toBeOk(Cl.uint(1000000000000 - transferAmount));
    expect(aliceBalance.result).toBeOk(Cl.uint(transferAmount));
  });

  it('should implement optional get-token-uri function', () => {
    // Initially should return none
    const initialUri = simnet.callPublicFn('sip010-token', 'get-token-uri', [], deployer);
    expect(initialUri.result).toBeOk(Cl.none());
    
    // Set URI and verify
    const newUri = "https://example.com/metadata.json";
    simnet.callPublicFn('sip010-token', 'set-token-uri', [Cl.some(Cl.stringUtf8(newUri))], deployer);
    
    const updatedUri = simnet.callPublicFn('sip010-token', 'get-token-uri', [], deployer);
    expect(updatedUri.result).toBeOk(Cl.some(Cl.stringUtf8(newUri)));
  });

  it('should handle memo parameter in transfers', () => {
    const transferAmount = 500;
    const memo = "Payment for services";
    
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

  it('should maintain consistent state across operations', () => {
    const mintAmount = 10000;
    const transferAmount = 3000;
    const burnAmount = 2000;
    
    // Initial state
    const initialSupply = simnet.callReadOnlyFn('sip010-token', 'get-total-supply', [], deployer);
    const initialDeployerBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(deployer)], deployer);
    
    // Mint
    simnet.callPublicFn('sip010-token', 'mint', [Cl.uint(mintAmount), Cl.principal(alice)], deployer);
    
    // Transfer
    simnet.callPublicFn('sip010-token', 'transfer', [Cl.uint(transferAmount), Cl.principal(alice), Cl.principal(deployer), Cl.none()], alice);
    
    // Burn
    simnet.callPublicFn('sip010-token', 'burn', [Cl.uint(burnAmount)], alice);
    
    // Verify final state
    const finalSupply = simnet.callReadOnlyFn('sip010-token', 'get-total-supply', [], deployer);
    const finalDeployerBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(deployer)], deployer);
    const finalAliceBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(alice)], deployer);
    
    // Total supply should be initial + mint - burn
    expect(finalSupply.result).toBeOk(Cl.uint(1000000000000 + mintAmount - burnAmount));
    
    // Deployer balance should be initial + transfer
    expect(finalDeployerBalance.result).toBeOk(Cl.uint(1000000000000 + transferAmount));
    
    // Alice balance should be mint - transfer - burn
    expect(finalAliceBalance.result).toBeOk(Cl.uint(mintAmount - transferAmount - burnAmount));
  });
});