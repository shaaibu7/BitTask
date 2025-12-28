import { describe, expect, it, beforeEach } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const alice = accounts.get('wallet_1')!;
const bob = accounts.get('wallet_2')!;
describe('BitToken Contract', () => {
  it('should have correct token metadata', () => {
    const name = simnet.callReadOnlyFn('token', 'get-name', [], deployer);
    const symbol = simnet.callReadOnlyFn('token', 'get-symbol', [], deployer);
    const decimals = simnet.callReadOnlyFn('token', 'get-decimals', [], deployer);
    
    expect(name.result).toBeOk(Cl.stringAscii('BitToken'));
    expect(symbol.result).toBeOk(Cl.stringAscii('BTK'));
    expect(decimals.result).toBeOk(Cl.uint(6));
  });
});
  it('should have correct total supply and initial balance', () => {
    const totalSupply = simnet.callReadOnlyFn('token', 'get-total-supply', [], deployer);
    const deployerBalance = simnet.callReadOnlyFn('token', 'get-balance', [Cl.principal(deployer)], deployer);
    
    expect(totalSupply.result).toBeOk(Cl.uint(1000000000000));
    expect(deployerBalance.result).toBeOk(Cl.uint(1000000000000));
  });
  it('should transfer tokens successfully', () => {
    const transferAmount = 1000;
    
    const transfer = simnet.callPublicFn(
      'token', 
      'transfer', 
      [Cl.uint(transferAmount), Cl.principal(deployer), Cl.principal(alice), Cl.none()], 
      deployer
    );
    
    expect(transfer.result).toBeOk(Cl.bool(true));
    
    const aliceBalance = simnet.callReadOnlyFn('token', 'get-balance', [Cl.principal(alice)], deployer);
    expect(aliceBalance.result).toBeOk(Cl.uint(transferAmount));
  });
  it('should fail transfer when unauthorized', () => {
    const transferAmount = 1000;
    
    const transfer = simnet.callPublicFn(
      'token', 
      'transfer', 
      [Cl.uint(transferAmount), Cl.principal(deployer), Cl.principal(alice), Cl.none()], 
      alice // Alice trying to transfer deployer's tokens
    );
    
    expect(transfer.result).toBeErr(Cl.uint(3)); // ERR-UNAUTHORIZED
  });