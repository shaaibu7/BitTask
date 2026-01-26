import { describe, it, expect } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe('complete task lifecycle', () => {
    it('should complete full workflow: create -> accept -> submit -> approve', () => {
        const deadline = simnet.blockHeight + 100;
        const amount = 5000;

        // Create task
        const createResult = simnet.callPublicFn('bittask', 'create-task', [
            Cl.stringAscii("Complete Task"),
            Cl.stringAscii("Full workflow test"),
            Cl.uint(amount),
            Cl.uint(deadline)
        ], wallet1);

        expect(createResult.result).toBeOk(Cl.uint(1));

        // Accept task
        const acceptResult = simnet.callPublicFn(
            'bittask',
            'accept-task',
            [Cl.uint(1)],
            wallet2
        );
        expect(acceptResult.result).toBeOk(Cl.bool(true));

        // Submit work
        const submitResult = simnet.callPublicFn(
            'bittask',
            'submit-work',
            [Cl.uint(1), Cl.stringAscii("https://github.com/work")],
            wallet2
        );
        expect(submitResult.result).toBeOk(Cl.bool(true));

        // Approve work
        const approveResult = simnet.callPublicFn(
            'bittask',
            'approve-work',
            [Cl.uint(1)],
            wallet1
        );
        expect(approveResult.result).toBeOk(Cl.bool(true));

        // Verify final state
        const task = simnet.callReadOnlyFn('bittask', 'get-task', [Cl.uint(1)], deployer);
        expect(task.result).toBeSome(expect.objectContaining({
            status: Cl.stringAscii("completed")
        }));
    });
});

