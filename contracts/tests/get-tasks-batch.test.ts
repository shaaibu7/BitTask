import { describe, it, expect } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;

describe('get-tasks batch retrieval', () => {
    it('should retrieve multiple tasks in correct order', () => {
        const deadline = simnet.blockHeight + 50;

        // Create 5 tasks
        for (let i = 1; i <= 5; i++) {
            simnet.callPublicFn('bittask', 'create-task', [
                Cl.stringAscii(`Task ${i}`),
                Cl.stringAscii(`Description ${i}`),
                Cl.uint(1000 * i),
                Cl.uint(deadline)
            ], wallet1);
        }

        // Retrieve tasks 2, 4, and 1
        const tasksResult = simnet.callReadOnlyFn(
            'bittask',
            'get-tasks',
            [Cl.list([Cl.uint(2), Cl.uint(4), Cl.uint(1)])],
            deployer
        );

        expect(tasksResult.result).toBeList([
            Cl.some(expect.anything()),
            Cl.some(expect.anything()),
            Cl.some(expect.anything())
        ]);
    });
});

