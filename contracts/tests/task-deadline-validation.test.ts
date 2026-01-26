import { describe, it, expect } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;

describe('task deadline validation', () => {
    it('should fail when deadline equals current block height', () => {
        const currentHeight = simnet.blockHeight;
        const { result } = simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Task"),
                Cl.stringAscii("Description"),
                Cl.uint(1000),
                Cl.uint(currentHeight)
            ],
            wallet1
        );

        expect(result).toBeErr(Cl.uint(103)); // ERR-PAST-DEADLINE
    });

    it('should succeed when deadline is one block in future', () => {
        const deadline = simnet.blockHeight + 1;
        const { result } = simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Task"),
                Cl.stringAscii("Description"),
                Cl.uint(1000),
                Cl.uint(deadline)
            ],
            wallet1
        );

        expect(result).toBeOk(expect.anything());
    });
});

