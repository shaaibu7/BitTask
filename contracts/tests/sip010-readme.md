# SIP-010 Token Test Suite

This directory contains comprehensive tests for the SIP-010 compliant BitToken (BTK) implementation.

## Test Files Overview

### Core Functionality Tests
- `sip010-token.test.ts` - Basic token metadata and initialization tests
- `sip010-transfer.test.ts` - Token transfer functionality tests
- `sip010-allowance.test.ts` - Allowance system tests
- `sip010-transfer-from.test.ts` - Transfer-from functionality tests

### Administrative Function Tests
- `sip010-mint.test.ts` - Token minting tests
- `sip010-burn.test.ts` - Token burning tests
- `sip010-ownership.test.ts` - Contract ownership management tests
- `sip010-uri.test.ts` - Token URI management tests

### Advanced Testing
- `sip010-edge-cases.test.ts` - Edge case scenarios
- `sip010-events.test.ts` - Event emission validation
- `sip010-integration.test.ts` - Complex multi-operation scenarios
- `sip010-compliance.test.ts` - SIP-010 standard compliance verification
- `sip010-error-handling.test.ts` - Error code validation
- `sip010-gas-optimization.test.ts` - Gas usage optimization tests
- `sip010-security.test.ts` - Security vulnerability tests
- `sip010-stress.test.ts` - High-volume transaction tests
- `sip010-test-runner.test.ts` - Test environment validation

## Running Tests

```bash
npm test
```

## Test Coverage

The test suite covers:
- ✅ All SIP-010 required functions
- ✅ Optional SIP-010 functions (get-token-uri)
- ✅ Extended functionality (allowances, minting, burning)
- ✅ Administrative functions
- ✅ Error handling and edge cases
- ✅ Security vulnerabilities
- ✅ Gas optimization
- ✅ Event emission
- ✅ Integration scenarios
- ✅ Stress testing

## Test Accounts

- `deployer` - Contract owner and initial token holder
- `wallet_1` (alice) - Test user 1
- `wallet_2` (bob) - Test user 2  
- `wallet_3` (charlie) - Test user 3

## Key Test Scenarios

1. **Basic Operations**: Transfer, approve, allowance checks
2. **Administrative**: Minting, burning, ownership transfer
3. **Security**: Unauthorized access prevention, overflow protection
4. **Edge Cases**: Zero amounts, self-transfers, maximum values
5. **Integration**: Complex multi-user, multi-operation workflows
6. **Stress**: High-volume transactions, rapid state changes