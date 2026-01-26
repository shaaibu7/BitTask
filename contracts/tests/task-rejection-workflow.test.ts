import { describe, it, expect } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

describe('task rejection workflow', () => {
    it('should allow task to be re-accepted after rejection', () => {
        const deadline = simnet.blockHeight + 100;

        // Create and accept task
        simnet.callPublicFn('bittask', 'create-task', [
            Cl.stringAscii("Task"), Cl.stringAscii("Desc"), Cl.uint(1000), Cl.uint(deadline)
        ], wallet1);

        simnet.callPublicFn('bittask', 'accept-task', [Cl.uint(1)], wallet2);
        simnet.callPublicFn('bittask', 'submit-work', [Cl.uint(1), Cl.stringAscii("link")], wallet2);

        // Reject work
        simnet.callPublicFn('bittask', 'reject-work', [Cl.uint(1)], wallet1);

        // Task should be open again and can be accepted by different worker
        const acceptResult = simnet.callPublicFn(
            'bittask',
            'accept-task',
            [Cl.uint(1)],
            wallet3
        );

        expect(acceptResult.result).toBeOk(Cl.bool(true));

        const task = simnet.callReadOnlyFn('bittask', 'get-task', [Cl.uint(1)], deployer);
        expect(task.result).toBeSome(expect.objectContaining({
            status: Cl.stringAscii("in-progress"),
            worker: Cl.some(Cl.principal(wallet3))
        }));
    });
});

