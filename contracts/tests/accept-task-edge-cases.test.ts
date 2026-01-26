import { describe, it, expect } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe('accept-task edge cases', () => {
    it('should fail if task does not exist', () => {
        const { result } = simnet.callPublicFn(
            'bittask',
            'accept-task',
            [Cl.uint(999)],
            wallet2
        );

        expect(result).toBeErr(Cl.uint(101)); // ERR-INVALID-ID
    });

    it('should fail if task is already submitted', () => {
        const deadline = simnet.blockHeight + 50;

        simnet.callPublicFn('bittask', 'create-task', [
            Cl.stringAscii("Task"), Cl.stringAscii("Desc"), Cl.uint(1000), Cl.uint(deadline)
        ], wallet1);

        simnet.callPublicFn('bittask', 'accept-task', [Cl.uint(1)], wallet2);
        simnet.callPublicFn('bittask', 'submit-work', [Cl.uint(1), Cl.stringAscii("link")], wallet2);

        const { result } = simnet.callPublicFn(
            'bittask',
            'accept-task',
            [Cl.uint(1)],
            wallet2
        );

        expect(result).toBeErr(Cl.uint(107)); // ERR-NOT-OPEN
    });
});

