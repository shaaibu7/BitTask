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
  it('should approve and check allowances', () => {
    const approveAmount = 5000;
    
    const approve = simnet.callPublicFn(
      'token', 
      'approve', 
      [Cl.principal(alice), Cl.uint(approveAmount)], 
      deployer
    );
    
    expect(approve.result).toBeOk(Cl.bool(true));
    
    const allowance = simnet.callReadOnlyFn(
      'token', 
      'get-allowance', 
      [Cl.principal(deployer), Cl.principal(alice)], 
      deployer
    );
    
    expect(allowance.result).toBeOk(Cl.uint(approveAmount));
  });
  it('should transfer-from with valid allowance', () => {
    const approveAmount = 5000;
    const transferAmount = 2000;
    
    // First approve
    simnet.callPublicFn('token', 'approve', [Cl.principal(alice), Cl.uint(approveAmount)], deployer);
    
    // Then transfer-from
    const transferFrom = simnet.callPublicFn(
      'token', 
      'transfer-from', 
      [Cl.uint(transferAmount), Cl.principal(deployer), Cl.principal(bob), Cl.none()], 
      alice
    );
    
    expect(transferFrom.result).toBeOk(Cl.bool(true));
    
    const bobBalance = simnet.callReadOnlyFn('token', 'get-balance', [Cl.principal(bob)], deployer);
    expect(bobBalance.result).toBeOk(Cl.uint(transferAmount));
    
    const remainingAllowance = simnet.callReadOnlyFn(
      'token', 
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
    simnet.callPublicFn('token', 'approve', [Cl.principal(alice), Cl.uint(approveAmount)], deployer);
    
    // Try to transfer more than allowed
    const transferFrom = simnet.callPublicFn(
      'token', 
      'transfer-from', 
      [Cl.uint(transferAmount), Cl.principal(deployer), Cl.principal(bob), Cl.none()], 
      alice
    );
    
    expect(transferFrom.result).toBeErr(Cl.uint(2)); // ERR-INSUFFICIENT-ALLOWANCE
  });
  it('should mint tokens as contract owner', () => {
    const mintAmount = 10000;
    
    const mint = simnet.callPublicFn(
      'token', 
      'mint', 
      [Cl.uint(mintAmount), Cl.principal(alice)], 
      deployer
    );
    
    expect(mint.result).toBeOk(Cl.bool(true));
    
    const aliceBalance = simnet.callReadOnlyFn('token', 'get-balance', [Cl.principal(alice)], deployer);
    expect(aliceBalance.result).toBeOk(Cl.uint(mintAmount));
  });
  it('should fail mint when not contract owner', () => {
    const mintAmount = 10000;
    
    const mint = simnet.callPublicFn(
      'token', 
      'mint', 
      [Cl.uint(mintAmount), Cl.principal(alice)], 
      alice // Alice trying to mint
    );
    
    expect(mint.result).toBeErr(Cl.uint(3)); // ERR-UNAUTHORIZED
  });
  it('should burn tokens successfully', () => {
    const transferAmount = 5000;
    const burnAmount = 2000;
    
    // First transfer some tokens to alice
    simnet.callPublicFn('token', 'transfer', [Cl.uint(transferAmount), Cl.principal(deployer), Cl.principal(alice), Cl.none()], deployer);
    
    // Alice burns some tokens
    const burn = simnet.callPublicFn('token', 'burn', [Cl.uint(burnAmount)], alice);
    
    expect(burn.result).toBeOk(Cl.bool(true));
    
    const aliceBalance = simnet.callReadOnlyFn('token', 'get-balance', [Cl.principal(alice)], deployer);
    expect(aliceBalance.result).toBeOk(Cl.uint(transferAmount - burnAmount));
  });
  it('should transfer contract ownership', () => {
    const setOwner = simnet.callPublicFn(
      'token', 
      'set-contract-owner', 
      [Cl.principal(alice)], 
      deployer
    );
    
    expect(setOwner.result).toBeOk(Cl.bool(true));
    
    const newOwner = simnet.callReadOnlyFn('token', 'get-contract-owner', [], deployer);
    expect(newOwner.result).toBePrincipal(alice);
  });
  it('should fail ownership transfer when not owner', () => {
    const setOwner = simnet.callPublicFn(
      'token', 
      'set-contract-owner', 
      [Cl.principal(bob)], 
      alice // Alice trying to transfer ownership
    );
    
    expect(setOwner.result).toBeErr(Cl.uint(3)); // ERR-UNAUTHORIZED
  });