import { describe, expect, it } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const alice = accounts.get('wallet_1')!;
const bob = accounts.get('wallet_2')!;

describe('SIP-010 Token - Event Emission', () => {
  it('should emit transfer event', () => {
    const transferAmount = 1000;
    
    const { result, events } = simnet.callPublicFn(
      'sip010-token', 
      'transfer', 
      [Cl.uint(transferAmount), Cl.principal(deployer), Cl.principal(alice), Cl.some(Cl.bufferFromAscii("test memo"))], 
      deployer
    );
    
    expect(result).toBeOk(Cl.bool(true));
    expect(events).toHaveLength(2); // ft_transfer_event + print event
    
    const printEvent = events.find(e => e.event === 'print');
    expect(printEvent).toBeDefined();
  });

  it('should emit approval event', () => {
    const approveAmount = 5000;
    
    const { result, events } = simnet.callPublicFn(
      'sip010-token', 
      'approve', 
      [Cl.principal(alice), Cl.uint(approveAmount)], 
      deployer
    );
    
    expect(result).toBeOk(Cl.bool(true));
    expect(events).toHaveLength(1); // print event
    
    const printEvent = events.find(e => e.event === 'print');
    expect(printEvent).toBeDefined();
  });

  it('should emit mint event', () => {
    const mintAmount = 10000;
    
    const { result, events } = simnet.callPublicFn(
      'sip010-token', 
      'mint', 
      [Cl.uint(mintAmount), Cl.principal(alice)], 
      deployer
    );
    
    expect(result).toBeOk(Cl.bool(true));
    expect(events).toHaveLength(2); // ft_mint_event + print event
    
    const printEvent = events.find(e => e.event === 'print');
    expect(printEvent).toBeDefined();
  });

  it('should emit burn event', () => {
    const transferAmount = 5000;
    const burnAmount = 2000;
    
    // First transfer tokens to alice
    simnet.callPublicFn('sip010-token', 'transfer', [Cl.uint(transferAmount), Cl.principal(deployer), Cl.principal(alice), Cl.none()], deployer);
    
    // Then burn
    const { result, events } = simnet.callPublicFn('sip010-token', 'burn', [Cl.uint(burnAmount)], alice);
    
    expect(result).toBeOk(Cl.bool(true));
    expect(events).toHaveLength(2); // ft_burn_event + print event
    
    const printEvent = events.find(e => e.event === 'print');
    expect(printEvent).toBeDefined();
  });

  it('should emit ownership transfer event', () => {
    const { result, events } = simnet.callPublicFn(
      'sip010-token', 
      'set-contract-owner', 
      [Cl.principal(alice)], 
      deployer
    );
    
    expect(result).toBeOk(Cl.bool(true));
    expect(events).toHaveLength(1); // print event
    
    const printEvent = events.find(e => e.event === 'print');
    expect(printEvent).toBeDefined();
  });

  it('should emit URI update event', () => {
    const newUri = "https://example.com/updated-metadata.json";
    
    const { result, events } = simnet.callPublicFn(
      'sip010-token', 
      'set-token-uri', 
      [Cl.some(Cl.stringUtf8(newUri))], 
      deployer
    );
    
    expect(result).toBeOk(Cl.bool(true));
    expect(events).toHaveLength(1); // print event
    
    const printEvent = events.find(e => e.event === 'print');
    expect(printEvent).toBeDefined();
  });
});