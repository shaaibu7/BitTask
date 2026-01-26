import { describe, it, expect } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;

describe('nonce increment behavior', () => {
    it('should increment nonce correctly across multiple tasks', () => {
        const deadline = simnet.blockHeight + 50;

        // Get initial nonce
        let nonceResult = simnet.callReadOnlyFn('bittask', 'get-nonce', [], deployer);
        const initialNonce = Number((nonceResult.result as any).value);

        // Create 3 tasks
        for (let i = 1; i <= 3; i++) {
            simnet.callPublicFn('bittask', 'create-task', [
                Cl.stringAscii(`Task ${i}`),
                Cl.stringAscii(`Description ${i}`),
                Cl.uint(1000 * i),
                Cl.uint(deadline)
            ], wallet1);

            nonceResult = simnet.callReadOnlyFn('bittask', 'get-nonce', [], deployer);
            expect(Number((nonceResult.result as any).value)).toBe(initialNonce + i);
        }
    });
});

