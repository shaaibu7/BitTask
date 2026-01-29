import { describe, expect, it } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const alice = accounts.get('wallet_1')!;

describe('SIP-010 Token - URI Management', () => {
  it('should return none for initial token URI', () => {
    const uri = simnet.callPublicFn('sip010-token', 'get-token-uri', [], deployer);
    expect(uri.result).toBeOk(Cl.none());
  });

  it('should set token URI as contract owner', () => {
    const newUri = "https://example.com/token-metadata.json";
    
    const setUri = simnet.callPublicFn(
      'sip010-token', 
      'set-token-uri', 
      [Cl.some(Cl.stringUtf8(newUri))], 
      deployer
    );
    
    expect(setUri.result).toBeOk(Cl.bool(true));
    
    const uri = simnet.callPublicFn('sip010-token', 'get-token-uri', [], deployer);
    expect(uri.result).toBeOk(Cl.some(Cl.stringUtf8(newUri)));
  });

  it('should fail to set URI when not contract owner', () => {
    const newUri = "https://malicious.com/fake-metadata.json";
    
    const setUri = simnet.callPublicFn(
      'sip010-token', 
      'set-token-uri', 
      [Cl.some(Cl.stringUtf8(newUri))], 
      alice
    );
    
    expect(setUri.result).toBeErr(Cl.uint(100)); // ERR-OWNER-ONLY
  });

  it('should clear token URI by setting to none', () => {
    // First set a URI
    const initialUri = "https://example.com/metadata.json";
    simnet.callPublicFn('sip010-token', 'set-token-uri', [Cl.some(Cl.stringUtf8(initialUri))], deployer);
    
    // Then clear it
    const clearUri = simnet.callPublicFn(
      'sip010-token', 
      'set-token-uri', 
      [Cl.none()], 
      deployer
    );
    
    expect(clearUri.result).toBeOk(Cl.bool(true));
    
    const uri = simnet.callPublicFn('sip010-token', 'get-token-uri', [], deployer);
    expect(uri.result).toBeOk(Cl.none());
  });

  it('should update token URI multiple times', () => {
    const firstUri = "https://example.com/v1/metadata.json";
    const secondUri = "https://example.com/v2/metadata.json";
    
    // Set first URI
    simnet.callPublicFn('sip010-token', 'set-token-uri', [Cl.some(Cl.stringUtf8(firstUri))], deployer);
    
    // Update to second URI
    const updateUri = simnet.callPublicFn(
      'sip010-token', 
      'set-token-uri', 
      [Cl.some(Cl.stringUtf8(secondUri))], 
      deployer
    );
    
    expect(updateUri.result).toBeOk(Cl.bool(true));
    
    const uri = simnet.callPublicFn('sip010-token', 'get-token-uri', [], deployer);
    expect(uri.result).toBeOk(Cl.some(Cl.stringUtf8(secondUri)));
  });
});