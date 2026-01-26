import { describe, it, expect } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe('reclaim-expired', () => {
    it('should reclaim an expired open task by creator', () => {
        const currentHeight = simnet.blockHeight;
        const deadline = currentHeight + 1;

        // Create task with near-future deadline
        simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Expiring Task"),
                Cl.stringAscii("Description"),
                Cl.uint(1000),
                Cl.uint(deadline)
            ],
            wallet1
        );

        // Advance blocks until after deadline
        simnet.mineEmptyBlocks(2);

        // Reclaim expired task
        const { result } = simnet.callPublicFn(
            'bittask',
            'reclaim-expired',
            [Cl.uint(1)],
            wallet1
        );

        expect(result).toBeOk(Cl.bool(true));

        // Verify task is now completed
        const task = simnet.callReadOnlyFn(
            'bittask',
            'get-task',
            [Cl.uint(1)],
            deployer
        );

        expect(task.result).toBeSome(
            expect.objectContaining({
                status: Cl.stringAscii("completed")
            })
        );
    });
});


