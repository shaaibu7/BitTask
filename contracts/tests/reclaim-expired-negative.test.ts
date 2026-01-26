import { describe, it, expect } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe('reclaim-expired negative paths', () => {
    it('should fail if caller is not the creator', () => {
        const deadline = simnet.blockHeight + 1;

        simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Task"),
                Cl.stringAscii("Desc"),
                Cl.uint(1000),
                Cl.uint(deadline)
            ],
            wallet1
        );

        simnet.mineEmptyBlocks(2);

        const { result } = simnet.callPublicFn(
            'bittask',
            'reclaim-expired',
            [Cl.uint(1)],
            wallet2
        );

        expect(result).toBeErr(Cl.uint(111)); // ERR-NOT-CREATOR
    });

    it('should fail if task is not open', () => {
        const deadline = simnet.blockHeight + 1;

        simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Task"),
                Cl.stringAscii("Desc"),
                Cl.uint(1000),
                Cl.uint(deadline)
            ],
            wallet1
        );

        // Accept task so it is no longer open
        simnet.callPublicFn(
            'bittask',
            'accept-task',
            [Cl.uint(1)],
            wallet2
        );

        simnet.mineEmptyBlocks(2);

        const { result } = simnet.callPublicFn(
            'bittask',
            'reclaim-expired',
            [Cl.uint(1)],
            wallet1
        );

        expect(result).toBeErr(Cl.uint(107)); // ERR-NOT-OPEN
    });
}
);


