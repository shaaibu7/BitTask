import { describe, expect, it } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const alice = accounts.get('wallet_1')!;
const bob = accounts.get('wallet_2')!;
const charlie = accounts.get('wallet_3')!;

describe('SIP-010 Token - Stress Tests', () => {
  it('should handle multiple sequential transfers', () => {
    const transferAmount = 1000;
    const numTransfers = 10;
    
    // Perform multiple transfers
    for (let i = 0; i < numTransfers; i++) {
      const recipient = i % 2 === 0 ? alice : bob;
      const transfer = simnet.callPublicFn(
        'sip010-token', 
        'transfer', 
        [Cl.uint(transferAmount), Cl.principal(deployer), Cl.principal(recipient), Cl.none()], 
        deployer
      );
      expect(transfer.result).toBeOk(Cl.bool(true));
    }
    
    // Verify final balances
    const aliceBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(alice)], deployer);
    const bobBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(bob)], deployer);
    
    expect(aliceBalance.result).toBeOk(Cl.uint(transferAmount * 5)); // 5 transfers to Alice
    expect(bobBalance.result).toBeOk(Cl.uint(transferAmount * 5)); // 5 transfers to Bob
  });

  it('should handle multiple approval updates', () => {
    const baseAmount = 1000;
    const numApprovals = 15;
    
    // Perform multiple approvals with increasing amounts
    for (let i = 1; i <= numApprovals; i++) {
      const approveAmount = baseAmount * i;
      const approve = simnet.callPublicFn(
        'sip010-token', 
        'approve', 
        [Cl.principal(alice), Cl.uint(approveAmount)], 
        deployer
      );
      expect(approve.result).toBeOk(Cl.bool(true));
    }
    
    // Verify final allowance
    const finalAllowance = simnet.callReadOnlyFn(
      'sip010-token', 
      'get-allowance', 
      [Cl.principal(deployer), Cl.principal(alice)], 
      deployer
    );
    expect(finalAllowance.result).toBeOk(Cl.uint(baseAmount * numApprovals));
  });

  it('should handle complex allowance usage patterns', () => {
    const initialApproval = 10000;
    const transferAmount = 500;
    const numTransfers = 15;
    
    // Initial approval
    simnet.callPublicFn('sip010-token', 'approve', [Cl.principal(alice), Cl.uint(initialApproval)], deployer);
    
    // Perform multiple transfer-from operations
    for (let i = 0; i < numTransfers; i++) {
      const recipient = i % 3 === 0 ? bob : charlie;
      const transferFrom = simnet.callPublicFn(
        'sip010-token', 
        'transfer-from', 
        [Cl.uint(transferAmount), Cl.principal(deployer), Cl.principal(recipient), Cl.none()], 
        alice
      );
      expect(transferFrom.result).toBeOk(Cl.bool(true));
    }
    
    // Verify remaining allowance
    const remainingAllowance = simnet.callReadOnlyFn(
      'sip010-token', 
      'get-allowance', 
      [Cl.principal(deployer), Cl.principal(alice)], 
      deployer
    );
    expect(remainingAllowance.result).toBeOk(Cl.uint(initialApproval - (transferAmount * numTransfers)));
    
    // Verify recipient balances
    const bobBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(bob)], deployer);
    const charlieBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(charlie)], deployer);
    
    // Bob gets transfers when i % 3 === 0 (i = 0, 3, 6, 9, 12) = 5 transfers
    // Charlie gets the rest = 10 transfers
    expect(bobBalance.result).toBeOk(Cl.uint(transferAmount * 5));
    expect(charlieBalance.result).toBeOk(Cl.uint(transferAmount * 10));
  });

  it('should handle multiple mint and burn cycles', () => {
    const mintAmount = 5000;
    const burnAmount = 2000;
    const numCycles = 8;
    const initialSupply = 1000000000000;
    
    let expectedSupply = initialSupply;
    
    // Perform multiple mint/burn cycles
    for (let i = 0; i < numCycles; i++) {
      // Mint to Alice
      const mint = simnet.callPublicFn('sip010-token', 'mint', [Cl.uint(mintAmount), Cl.principal(alice)], deployer);
      expect(mint.result).toBeOk(Cl.bool(true));
      expectedSupply += mintAmount;
      
      // Alice burns some tokens
      const burn = simnet.callPublicFn('sip010-token', 'burn', [Cl.uint(burnAmount)], alice);
      expect(burn.result).toBeOk(Cl.bool(true));
      expectedSupply -= burnAmount;
    }
    
    // Verify final supply
    const finalSupply = simnet.callReadOnlyFn('sip010-token', 'get-total-supply', [], deployer);
    expect(finalSupply.result).toBeOk(Cl.uint(expectedSupply));
    
    // Verify Alice's final balance
    const aliceBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(alice)], deployer);
    expect(aliceBalance.result).toBeOk(Cl.uint((mintAmount - burnAmount) * numCycles));
  });

  it('should handle rapid ownership transfers', () => {
    const accounts = [alice, bob, charlie];
    let currentOwner = deployer;
    
    // Transfer ownership multiple times
    for (let i = 0; i < accounts.length; i++) {
      const newOwner = accounts[i];
      const transferOwnership = simnet.callPublicFn(
        'sip010-token', 
        'set-contract-owner', 
        [Cl.principal(newOwner)], 
        currentOwner
      );
      expect(transferOwnership.result).toBeOk(Cl.bool(true));
      
      // Verify ownership changed
      const verifyOwner = simnet.callReadOnlyFn('sip010-token', 'get-contract-owner', [], deployer);
      expect(verifyOwner.result).toBePrincipal(newOwner);
      
      currentOwner = newOwner;
    }
    
    // Final owner should be Charlie
    const finalOwner = simnet.callReadOnlyFn('sip010-token', 'get-contract-owner', [], deployer);
    expect(finalOwner.result).toBePrincipal(charlie);
  });

  it('should maintain consistency under high transaction volume', () => {
    const initialSupply = 1000000000000;
    const operations = [
      { type: 'mint', amount: 10000, account: alice },
      { type: 'transfer', amount: 5000, from: deployer, to: bob },
      { type: 'approve', amount: 15000, spender: alice },
      { type: 'transfer-from', amount: 3000, from: deployer, to: charlie, spender: alice },
      { type: 'burn', amount: 2000, account: alice },
      { type: 'mint', amount: 8000, account: bob },
      { type: 'transfer', amount: 4000, from: bob, to: alice },
      { type: 'burn', amount: 1000, account: charlie },
    ];
    
    let expectedSupply = initialSupply;
    let expectedDeployerBalance = initialSupply;
    let expectedAliceBalance = 0;
    let expectedBobBalance = 0;
    let expectedCharlieBalance = 0;
    let expectedAllowance = 0;
    
    // Execute operations and track expected state
    for (const op of operations) {
      switch (op.type) {
        case 'mint':
          simnet.callPublicFn('sip010-token', 'mint', [Cl.uint(op.amount), Cl.principal(op.account)], deployer);
          expectedSupply += op.amount;
          if (op.account === alice) expectedAliceBalance += op.amount;
          else if (op.account === bob) expectedBobBalance += op.amount;
          break;
          
        case 'transfer':
          simnet.callPublicFn('sip010-token', 'transfer', [Cl.uint(op.amount), Cl.principal(op.from), Cl.principal(op.to), Cl.none()], op.from);
          if (op.from === deployer) expectedDeployerBalance -= op.amount;
          else if (op.from === bob) expectedBobBalance -= op.amount;
          
          if (op.to === alice) expectedAliceBalance += op.amount;
          else if (op.to === bob) expectedBobBalance += op.amount;
          break;
          
        case 'approve':
          simnet.callPublicFn('sip010-token', 'approve', [Cl.principal(op.spender), Cl.uint(op.amount)], deployer);
          expectedAllowance = op.amount;
          break;
          
        case 'transfer-from':
          simnet.callPublicFn('sip010-token', 'transfer-from', [Cl.uint(op.amount), Cl.principal(op.from), Cl.principal(op.to), Cl.none()], op.spender);
          expectedDeployerBalance -= op.amount;
          expectedCharlieBalance += op.amount;
          expectedAllowance -= op.amount;
          break;
          
        case 'burn':
          simnet.callPublicFn('sip010-token', 'burn', [Cl.uint(op.amount)], op.account);
          expectedSupply -= op.amount;
          if (op.account === alice) expectedAliceBalance -= op.amount;
          else if (op.account === charlie) expectedCharlieBalance -= op.amount;
          break;
      }
    }
    
    // Verify final state
    const finalSupply = simnet.callReadOnlyFn('sip010-token', 'get-total-supply', [], deployer);
    const deployerBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(deployer)], deployer);
    const aliceBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(alice)], deployer);
    const bobBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(bob)], deployer);
    const charlieBalance = simnet.callReadOnlyFn('sip010-token', 'get-balance', [Cl.principal(charlie)], deployer);
    const allowance = simnet.callReadOnlyFn('sip010-token', 'get-allowance', [Cl.principal(deployer), Cl.principal(alice)], deployer);
    
    expect(finalSupply.result).toBeOk(Cl.uint(expectedSupply));
    expect(deployerBalance.result).toBeOk(Cl.uint(expectedDeployerBalance));
    expect(aliceBalance.result).toBeOk(Cl.uint(expectedAliceBalance));
    expect(bobBalance.result).toBeOk(Cl.uint(expectedBobBalance));
    expect(charlieBalance.result).toBeOk(Cl.uint(expectedCharlieBalance));
    expect(allowance.result).toBeOk(Cl.uint(expectedAllowance));
  });
});