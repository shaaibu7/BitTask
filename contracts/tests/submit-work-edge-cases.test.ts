import { describe, it, expect } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

describe('submit-work edge cases', () => {
    it('should fail if task does not exist', () => {
        const { result } = simnet.callPublicFn(
            'bittask',
            'submit-work',
            [Cl.uint(999), Cl.stringAscii("link")],
            wallet2
        );

        expect(result).toBeErr(Cl.uint(101)); // ERR-INVALID-ID
    });

    it('should fail if task is already completed', () => {
        const deadline = simnet.blockHeight + 50;

        simnet.callPublicFn('bittask', 'create-task', [
            Cl.stringAscii("Task"), Cl.stringAscii("Desc"), Cl.uint(1000), Cl.uint(deadline)
        ], wallet1);

        simnet.callPublicFn('bittask', 'accept-task', [Cl.uint(1)], wallet2);
        simnet.callPublicFn('bittask', 'submit-work', [Cl.uint(1), Cl.stringAscii("link")], wallet2);
        simnet.callPublicFn('bittask', 'approve-work', [Cl.uint(1)], wallet1);

        const { result } = simnet.callPublicFn(
            'bittask',
            'submit-work',
            [Cl.uint(1), Cl.stringAscii("new-link")],
            wallet2
        );

        expect(result).toBeErr(Cl.uint(108)); // ERR-NOT-IN-PROGRESS
    });
});

