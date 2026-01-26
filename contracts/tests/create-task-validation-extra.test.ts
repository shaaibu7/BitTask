import { describe, it, expect } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;

describe('create-task additional validation', () => {
    it('should fail when title is empty string', () => {
        const deadline = simnet.blockHeight + 10;

        const { result } = simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii(""),
                Cl.stringAscii("Description"),
                Cl.uint(1000),
                Cl.uint(deadline)
            ],
            wallet1
        );

        expect(result).toBeErr(Cl.uint(104)); // ERR-EMPTY-TITLE
    });

    it('should fail when description is empty string', () => {
        const deadline = simnet.blockHeight + 10;

        const { result } = simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Title"),
                Cl.stringAscii(""),
                Cl.uint(1000),
                Cl.uint(deadline)
            ],
            wallet1
        );

        expect(result).toBeErr(Cl.uint(105)); // ERR-EMPTY-DESCRIPTION
    });
});


