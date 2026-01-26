import { describe, it, expect } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;

describe('task amount boundaries', () => {
    it('should accept minimum amount of 1 micro-STX', () => {
        const deadline = simnet.blockHeight + 50;
        const { result } = simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Min Amount Task"),
                Cl.stringAscii("Testing minimum amount"),
                Cl.uint(1),
                Cl.uint(deadline)
            ],
            wallet1
        );

        expect(result).toBeOk(expect.anything());
    });

    it('should accept very large amounts', () => {
        const deadline = simnet.blockHeight + 50;
        const largeAmount = 1000000000; // 1 billion micro-STX
        const { result } = simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Large Amount Task"),
                Cl.stringAscii("Testing large amount"),
                Cl.uint(largeAmount),
                Cl.uint(deadline)
            ],
            wallet1
        );

        expect(result).toBeOk(expect.anything());
    });
});

