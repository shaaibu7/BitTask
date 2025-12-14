import { describe, it, expect } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe('validation', () => {
    describe('string validation', () => {
        it('should reject empty title', () => {
            const { result } = simnet.callPublicFn(
                'bittask',
                'create-task',
                [
                    Cl.stringAscii(""),
                    Cl.stringAscii("Valid description"),
                    Cl.uint(1000),
                    Cl.uint(simnet.blockHeight + 50)
                ],
                wallet1
            );

            expect(result).toBeErr(Cl.uint(104)); // ERR-EMPTY-TITLE
        });

        it('should reject empty description', () => {
            const { result } = simnet.callPublicFn(
                'bittask',
                'create-task',
                [
                    Cl.stringAscii("Valid title"),
                    Cl.stringAscii(""),
                    Cl.uint(1000),
                    Cl.uint(simnet.blockHeight + 50)
                ],
                wallet1
            );

            expect(result).toBeErr(Cl.uint(105)); // ERR-EMPTY-DESCRIPTION
        });

        it('should accept single character title', () => {
            const { result } = simnet.callPublicFn(
                'bittask',
                'create-task',
                [
                    Cl.stringAscii("A"),
                    Cl.stringAscii("Description"),
                    Cl.uint(1000),
                    Cl.uint(simnet.blockHeight + 50)
                ],
                wallet1
            );

            expect(result).toBeOk(Cl.uint(1));
        });

        it('should accept single character description', () => {
            const { result } = simnet.callPublicFn(
                'bittask',
                'create-task',
                [
                    Cl.stringAscii("Title"),
                    Cl.stringAscii("D"),
                    Cl.uint(1000),
                    Cl.uint(simnet.blockHeight + 50)
                ],
                wallet1
            );

            expect(result).toBeOk(Cl.uint(1));
        });

        it('should accept title with special characters', () => {
            const { result } = simnet.callPublicFn(
                'bittask',
                'create-task',
                [
                    Cl.stringAscii("Task-123_Test!"),
                    Cl.stringAscii("Description"),
                    Cl.uint(1000),
                    Cl.uint(simnet.blockHeight + 50)
                ],
                wallet1
            );

            expect(result).toBeOk(Cl.uint(1));
        });

        it('should accept description with special characters', () => {
            const { result } = simnet.callPublicFn(
                'bittask',
                'create-task',
                [
                    Cl.stringAscii("Title"),
                    Cl.stringAscii("Desc-123_Test!@#$%"),
                    Cl.uint(1000),
                    Cl.uint(simnet.blockHeight + 50)
                ],
                wallet1
            );

            expect(result).toBeOk(Cl.uint(1));
        });
    });

    describe('numeric validation', () => {
        it('should reject zero amount', () => {
            const { result } = simnet.callPublicFn(
                'bittask',
                'create-task',
                [
                    Cl.stringAscii("Title"),
                    Cl.stringAscii("Description"),
                    Cl.uint(0),
                    Cl.uint(simnet.blockHeight + 50)
                ],
                wallet1
            );

            expect(result).toBeErr(Cl.uint(100)); // ERR-ZERO-AMOUNT
        });

        it('should accept amount of 1', () => {
            const { result } = simnet.callPublicFn(
                'bittask',
                'create-task',
                [
                    Cl.stringAscii("Title"),
                    Cl.stringAscii("Description"),
                    Cl.uint(1),
                    Cl.uint(simnet.blockHeight + 50)
                ],
                wallet1
            );

            expect(result).toBeOk(Cl.uint(1));
        });

        it('should accept very large amounts', () => {
            const largeAmount = 999999999999;
            const { result } = simnet.callPublicFn(
                'bittask',
                'create-task',
                [
                    Cl.stringAscii("Title"),
                    Cl.stringAscii("Description"),
                    Cl.uint(largeAmount),
                    Cl.uint(simnet.blockHeight + 50)
                ],
                wallet1
            );

            expect(result).toBeOk(Cl.uint(1));
        });

        it('should accept common amounts', () => {
            const amounts = [100, 1000, 10000, 100000, 1000000];

            amounts.forEach((amount, index) => {
                const { result } = simnet.callPublicFn(
                    'bittask',
                    'create-task',
                    [
                        Cl.stringAscii(`Title ${index}`),
                        Cl.stringAscii("Description"),
                        Cl.uint(amount),
                        Cl.uint(simnet.blockHeight + 50)
                    ],
                    wallet1
                );

                expect(result).toBeOk(Cl.uint(index + 1));
            });
        });
    });

    describe('block height validation', () => {
        it('should reject deadline at current block height', () => {
            const { result } = simnet.callPublicFn(
                'bittask',
                'create-task',
                [
                    Cl.stringAscii("Title"),
                    Cl.stringAscii("Description"),
                    Cl.uint(1000),
                    Cl.uint(simnet.blockHeight)
                ],
                wallet1
            );

            expect(result).toBeErr(Cl.uint(103)); // ERR-PAST-DEADLINE
        });

        it('should reject deadline in the past', () => {
            // Create a task first to establish block height
            simnet.callPublicFn(
                'bittask',
                'create-task',
                [
                    Cl.stringAscii("Temp"),
                    Cl.stringAscii("Temp"),
                    Cl.uint(1000),
                    Cl.uint(simnet.blockHeight + 50)
                ],
                wallet1
            );
            
            const pastDeadline = simnet.blockHeight - 1;
            const { result } = simnet.callPublicFn(
                'bittask',
                'create-task',
                [
                    Cl.stringAscii("Title"),
                    Cl.stringAscii("Description"),
                    Cl.uint(1000),
                    Cl.uint(pastDeadline)
                ],
                wallet1
            );

            expect(result).toBeErr(Cl.uint(103)); // ERR-PAST-DEADLINE
        });

        it('should accept deadline at block height + 2', () => {
            const deadline = simnet.blockHeight + 2;
            const { result } = simnet.callPublicFn(
                'bittask',
                'create-task',
                [
                    Cl.stringAscii("Title"),
                    Cl.stringAscii("Description"),
                    Cl.uint(1000),
                    Cl.uint(deadline)
                ],
                wallet1
            );

            expect(result).toBeOk(Cl.uint(1));
        });

        it('should accept deadline far in the future', () => {
            const { result } = simnet.callPublicFn(
                'bittask',
                'create-task',
                [
                    Cl.stringAscii("Title"),
                    Cl.stringAscii("Description"),
                    Cl.uint(1000),
                    Cl.uint(simnet.blockHeight + 1000000)
                ],
                wallet1
            );

            expect(result).toBeOk(Cl.uint(1));
        });

        it('should accept various future deadlines', () => {
            const deadlines = [2, 10, 100, 1000, 10000];

            deadlines.forEach((offset, index) => {
                const { result } = simnet.callPublicFn(
                    'bittask',
                    'create-task',
                    [
                        Cl.stringAscii(`Title ${index}`),
                        Cl.stringAscii("Description"),
                        Cl.uint(1000),
                        Cl.uint(simnet.blockHeight + offset)
                    ],
                    wallet1
                );

                expect(result).toBeOk(Cl.uint(index + 1));
            });
        });
    });

    describe('boundary conditions', () => {
        it('should handle maximum title length (50 chars)', () => {
            const maxTitle = "a".repeat(50);
            const { result } = simnet.callPublicFn(
                'bittask',
                'create-task',
                [
                    Cl.stringAscii(maxTitle),
                    Cl.stringAscii("Description"),
                    Cl.uint(1000),
                    Cl.uint(simnet.blockHeight + 50)
                ],
                wallet1
            );

            expect(result).toBeOk(Cl.uint(1));
        });

        it('should handle maximum description length (256 chars)', () => {
            const maxDescription = "a".repeat(256);
            const { result } = simnet.callPublicFn(
                'bittask',
                'create-task',
                [
                    Cl.stringAscii("Title"),
                    Cl.stringAscii(maxDescription),
                    Cl.uint(1000),
                    Cl.uint(simnet.blockHeight + 50)
                ],
                wallet1
            );

            expect(result).toBeOk(Cl.uint(1));
        });

        it('should handle title just under maximum (49 chars)', () => {
            const title = "a".repeat(49);
            const { result } = simnet.callPublicFn(
                'bittask',
                'create-task',
                [
                    Cl.stringAscii(title),
                    Cl.stringAscii("Description"),
                    Cl.uint(1000),
                    Cl.uint(simnet.blockHeight + 50)
                ],
                wallet1
            );

            expect(result).toBeOk(Cl.uint(1));
        });

        it('should handle description just under maximum (255 chars)', () => {
            const description = "a".repeat(255);
            const { result } = simnet.callPublicFn(
                'bittask',
                'create-task',
                [
                    Cl.stringAscii("Title"),
                    Cl.stringAscii(description),
                    Cl.uint(1000),
                    Cl.uint(simnet.blockHeight + 50)
                ],
                wallet1
            );

            expect(result).toBeOk(Cl.uint(1));
        });
    });

    describe('access control validation', () => {
        it('should allow any principal to create a task', () => {
            const deadline = simnet.blockHeight + 50;

            const result1 = simnet.callPublicFn(
                'bittask',
                'create-task',
                [
                    Cl.stringAscii("Task 1"),
                    Cl.stringAscii("Description"),
                    Cl.uint(1000),
                    Cl.uint(deadline)
                ],
                wallet1
            );

            const result2 = simnet.callPublicFn(
                'bittask',
                'create-task',
                [
                    Cl.stringAscii("Task 2"),
                    Cl.stringAscii("Description"),
                    Cl.uint(1000),
                    Cl.uint(deadline)
                ],
                wallet2
            );

            expect(result1.result).toBeOk(Cl.uint(1));
            expect(result2.result).toBeOk(Cl.uint(2));
        });

        it('should allow any principal to accept a task', () => {
            const deadline = simnet.blockHeight + 50;

            simnet.callPublicFn(
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

            const { result } = simnet.callPublicFn(
                'bittask',
                'accept-task',
                [Cl.uint(1)],
                wallet2
            );

            expect(result).toBeOk(Cl.bool(true));
        });
    });
});
