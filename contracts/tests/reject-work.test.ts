import { describe, it, expect } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

describe('reject-work', () => {
    it('should reject submitted work and reopen the task', () => {
        const deadline = simnet.blockHeight + 50;

        // Create task
        simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Task to Reject"),
                Cl.stringAscii("Description"),
                Cl.uint(1000),
                Cl.uint(deadline)
            ],
            wallet1
        );

        // Accept task
        simnet.callPublicFn(
            'bittask',
            'accept-task',
            [Cl.uint(1)],
            wallet2
        );

        // Submit work
        simnet.callPublicFn(
            'bittask',
            'submit-work',
            [Cl.uint(1), Cl.stringAscii("link")],
            wallet2
        );

        // Reject work (creator)
        const { result } = simnet.callPublicFn(
            'bittask',
            'reject-work',
            [Cl.uint(1)],
            wallet1
        );

        expect(result).toBeOk(Cl.bool(true));

        // Verify task is open again with cleared worker and submission
        const task = simnet.callReadOnlyFn(
            'bittask',
            'get-task',
            [Cl.uint(1)],
            deployer
        );

        expect(task.result).toBeSome(
            expect.objectContaining({
                status: Cl.stringAscii("open"),
                worker: Cl.none(),
                submission: Cl.none()
            })
        );
    });

    it('should fail if caller is not the task creator', () => {
        const deadline = simnet.blockHeight + 50;

        // Create task
        simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Task to Reject"),
                Cl.stringAscii("Description"),
                Cl.uint(1000),
                Cl.uint(deadline)
            ],
            wallet1
        );

        // Accept task
        simnet.callPublicFn(
            'bittask',
            'accept-task',
            [Cl.uint(1)],
            wallet2
        );

        // Submit work
        simnet.callPublicFn(
            'bittask',
            'submit-work',
            [Cl.uint(1), Cl.stringAscii("link")],
            wallet2
        );

        // Try reject from worker wallet
        const { result } = simnet.callPublicFn(
            'bittask',
            'reject-work',
            [Cl.uint(1)],
            wallet2
        );

        expect(result).toBeErr(Cl.uint(111)); // ERR-NOT-CREATOR
    });

    it('should fail when task status is not submitted', () => {
        const deadline = simnet.blockHeight + 50;

        // Create task
        simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Task not submitted"),
                Cl.stringAscii("Description"),
                Cl.uint(1000),
                Cl.uint(deadline)
            ],
            wallet1
        );

        // Accept task but do not submit work
        simnet.callPublicFn(
            'bittask',
            'accept-task',
            [Cl.uint(1)],
            wallet2
        );

        // Attempt to reject without submission
        const { result } = simnet.callPublicFn(
            'bittask',
            'reject-work',
            [Cl.uint(1)],
            wallet1
        );

        expect(result).toBeErr(Cl.uint(110)); // ERR-NOT-SUBMITTED
    });

    it('should not allow a third-party account to reject work', () => {
        const deadline = simnet.blockHeight + 50;

        // Create task
        simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Task third-party"),
                Cl.stringAscii("Description"),
                Cl.uint(1000),
                Cl.uint(deadline)
            ],
            wallet1
        );

        // Accept task
        simnet.callPublicFn(
            'bittask',
            'accept-task',
            [Cl.uint(1)],
            wallet2
        );

        // Submit work
        simnet.callPublicFn(
            'bittask',
            'submit-work',
            [Cl.uint(1), Cl.stringAscii("link")],
            wallet2
        );

        // Try reject from unrelated wallet
        const { result } = simnet.callPublicFn(
            'bittask',
            'reject-work',
            [Cl.uint(1)],
            wallet3
        );

        expect(result).toBeErr(Cl.uint(111)); // ERR-NOT-CREATOR
    });
});
