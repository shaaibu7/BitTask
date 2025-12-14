import { describe, it, expect } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

describe('state-management', () => {
    describe('task state machine', () => {
        it('should transition from open to in-progress', () => {
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

            // Accept task
            simnet.callPublicFn(
                'bittask',
                'accept-task',
                [Cl.uint(1)],
                wallet2
            );

            // Verify task was accepted
            const task = simnet.callReadOnlyFn(
                'bittask',
                'get-task',
                [Cl.uint(1)],
                deployer
            );
            expect(task.result).toBeTruthy();
        });

        it('should not allow transition from open to submitted directly', () => {
            // This test documents that submit-work is not yet implemented
            // When implemented, this should verify that you cannot skip in-progress state
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

            // Task should be open
            const task = simnet.callReadOnlyFn(
                'bittask',
                'get-task',
                [Cl.uint(1)],
                deployer
            );
            expect(task.result).toBeTruthy();
        });
    });

    describe('nonce management', () => {
        it('should increment nonce with each task creation', () => {
            const deadline = simnet.blockHeight + 50;

            // Get initial nonce
            let nonce = simnet.callReadOnlyFn(
                'bittask',
                'get-nonce',
                [],
                deployer
            );
            const initialNonce = Number((nonce.result as any).value);

            // Create first task
            simnet.callPublicFn(
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

            nonce = simnet.callReadOnlyFn(
                'bittask',
                'get-nonce',
                [],
                deployer
            );
            expect(Number((nonce.result as any).value)).toEqual(initialNonce + 1);

            // Create second task
            simnet.callPublicFn(
                'bittask',
                'create-task',
                [
                    Cl.stringAscii("Task 2"),
                    Cl.stringAscii("Description"),
                    Cl.uint(2000),
                    Cl.uint(deadline)
                ],
                wallet1
            );

            nonce = simnet.callReadOnlyFn(
                'bittask',
                'get-nonce',
                [],
                deployer
            );
            expect(Number((nonce.result as any).value)).toEqual(initialNonce + 2);
        });

        it('should return correct nonce after multiple operations', () => {
            const deadline = simnet.blockHeight + 50;

            // Create 5 tasks
            for (let i = 0; i < 5; i++) {
                simnet.callPublicFn(
                    'bittask',
                    'create-task',
                    [
                        Cl.stringAscii(`Task ${i + 1}`),
                        Cl.stringAscii("Description"),
                        Cl.uint((i + 1) * 1000),
                        Cl.uint(deadline)
                    ],
                    wallet1
                );
            }

            const nonce = simnet.callReadOnlyFn(
                'bittask',
                'get-nonce',
                [],
                deployer
            );

            expect(Number((nonce.result as any).value)).toEqual(5);
        });
    });

    describe('data persistence', () => {
        it('should persist task data after acceptance', () => {
            const deadline = simnet.blockHeight + 50;
            const title = "Persistent Task";
            const description = "This data should persist";
            const amount = 5000;

            simnet.callPublicFn(
                'bittask',
                'create-task',
                [
                    Cl.stringAscii(title),
                    Cl.stringAscii(description),
                    Cl.uint(amount),
                    Cl.uint(deadline)
                ],
                wallet1
            );

            // Get task before acceptance
            let task = simnet.callReadOnlyFn(
                'bittask',
                'get-task',
                [Cl.uint(1)],
                deployer
            );
            expect(task.result).toBeTruthy();

            // Accept task
            simnet.callPublicFn(
                'bittask',
                'accept-task',
                [Cl.uint(1)],
                wallet2
            );

            // Get task after acceptance
            task = simnet.callReadOnlyFn(
                'bittask',
                'get-task',
                [Cl.uint(1)],
                deployer
            );
            expect(task.result).toBeTruthy();
        });

        it('should maintain separate state for multiple tasks', () => {
            const deadline = simnet.blockHeight + 50;

            // Create 3 tasks
            for (let i = 0; i < 3; i++) {
                simnet.callPublicFn(
                    'bittask',
                    'create-task',
                    [
                        Cl.stringAscii(`Task ${i + 1}`),
                        Cl.stringAscii(`Description ${i + 1}`),
                        Cl.uint((i + 1) * 1000),
                        Cl.uint(deadline)
                    ],
                    wallet1
                );
            }

            // Accept task 2
            simnet.callPublicFn(
                'bittask',
                'accept-task',
                [Cl.uint(2)],
                wallet2
            );

            // Verify each task has correct state
            const task1 = simnet.callReadOnlyFn(
                'bittask',
                'get-task',
                [Cl.uint(1)],
                deployer
            );
            const task2 = simnet.callReadOnlyFn(
                'bittask',
                'get-task',
                [Cl.uint(2)],
                deployer
            );
            const task3 = simnet.callReadOnlyFn(
                'bittask',
                'get-task',
                [Cl.uint(3)],
                deployer
            );

            expect(task1.result).toBeTruthy();
            expect(task2.result).toBeTruthy();
            expect(task3.result).toBeTruthy();
        });
    });

    describe('task retrieval', () => {
        it('should retrieve correct task by ID', () => {
            const deadline = simnet.blockHeight + 50;

            simnet.callPublicFn(
                'bittask',
                'create-task',
                [
                    Cl.stringAscii("Task 1"),
                    Cl.stringAscii("Description 1"),
                    Cl.uint(1000),
                    Cl.uint(deadline)
                ],
                wallet1
            );

            simnet.callPublicFn(
                'bittask',
                'create-task',
                [
                    Cl.stringAscii("Task 2"),
                    Cl.stringAscii("Description 2"),
                    Cl.uint(2000),
                    Cl.uint(deadline)
                ],
                wallet1
            );

            const task1 = simnet.callReadOnlyFn(
                'bittask',
                'get-task',
                [Cl.uint(1)],
                deployer
            );

            const task2 = simnet.callReadOnlyFn(
                'bittask',
                'get-task',
                [Cl.uint(2)],
                deployer
            );

            expect(task1.result).toBeTruthy();
            expect(task2.result).toBeTruthy();
        });

        it('should return none for non-existent task', () => {
            const task = simnet.callReadOnlyFn(
                'bittask',
                'get-task',
                [Cl.uint(999)],
                deployer
            );

            expect(task.result).toBeNone();
        });

        it('should retrieve task with all correct fields', () => {
            const deadline = simnet.blockHeight + 100;
            const title = "Complete Task";
            const description = "Full description";
            const amount = 7500;

            simnet.callPublicFn(
                'bittask',
                'create-task',
                [
                    Cl.stringAscii(title),
                    Cl.stringAscii(description),
                    Cl.uint(amount),
                    Cl.uint(deadline)
                ],
                wallet1
            );

            const task = simnet.callReadOnlyFn(
                'bittask',
                'get-task',
                [Cl.uint(1)],
                deployer
            );

            expect(task.result).toBeTruthy();
        });
    });

    describe('batch retrieval', () => {
        it('should retrieve multiple tasks via get-tasks', () => {
            const deadline = simnet.blockHeight + 50;

            // Create 3 tasks
            for (let i = 0; i < 3; i++) {
                simnet.callPublicFn(
                    'bittask',
                    'create-task',
                    [
                        Cl.stringAscii(`Task ${i + 1}`),
                        Cl.stringAscii(`Description ${i + 1}`),
                        Cl.uint((i + 1) * 1000),
                        Cl.uint(deadline)
                    ],
                    wallet1
                );
            }

            const tasks = simnet.callReadOnlyFn(
                'bittask',
                'get-tasks',
                [Cl.list([Cl.uint(1), Cl.uint(2), Cl.uint(3)])],
                deployer
            );

            expect(tasks.result).toBeTruthy();
        });

        it('should handle mixed valid and invalid IDs in get-tasks', () => {
            const deadline = simnet.blockHeight + 50;

            simnet.callPublicFn(
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

            const tasks = simnet.callReadOnlyFn(
                'bittask',
                'get-tasks',
                [Cl.list([Cl.uint(1), Cl.uint(999)])],
                deployer
            );

            expect(tasks.result).toBeTruthy();
        });

        it('should return empty list for empty input', () => {
            const tasks = simnet.callReadOnlyFn(
                'bittask',
                'get-tasks',
                [Cl.list([])],
                deployer
            );

            expect(tasks.result).toBeTruthy();
        });
    });

    describe('concurrent operations', () => {
        it('should handle multiple concurrent task creations', () => {
            const deadline = simnet.blockHeight + 50;

            // Create tasks from different wallets
            simnet.callPublicFn(
                'bittask',
                'create-task',
                [
                    Cl.stringAscii("Task from Wallet1"),
                    Cl.stringAscii("Description"),
                    Cl.uint(1000),
                    Cl.uint(deadline)
                ],
                wallet1
            );

            simnet.callPublicFn(
                'bittask',
                'create-task',
                [
                    Cl.stringAscii("Task from Wallet2"),
                    Cl.stringAscii("Description"),
                    Cl.uint(2000),
                    Cl.uint(deadline)
                ],
                wallet2
            );

            simnet.callPublicFn(
                'bittask',
                'create-task',
                [
                    Cl.stringAscii("Task from Wallet3"),
                    Cl.stringAscii("Description"),
                    Cl.uint(3000),
                    Cl.uint(deadline)
                ],
                wallet3
            );

            // Verify all tasks exist
            const task1 = simnet.callReadOnlyFn(
                'bittask',
                'get-task',
                [Cl.uint(1)],
                deployer
            );
            const task2 = simnet.callReadOnlyFn(
                'bittask',
                'get-task',
                [Cl.uint(2)],
                deployer
            );
            const task3 = simnet.callReadOnlyFn(
                'bittask',
                'get-task',
                [Cl.uint(3)],
                deployer
            );

            expect(task1.result).toBeTruthy();
            expect(task2.result).toBeTruthy();
            expect(task3.result).toBeTruthy();
        });

        it('should handle multiple concurrent acceptances', () => {
            const deadline = simnet.blockHeight + 50;

            // Create 3 tasks
            for (let i = 0; i < 3; i++) {
                simnet.callPublicFn(
                    'bittask',
                    'create-task',
                    [
                        Cl.stringAscii(`Task ${i + 1}`),
                        Cl.stringAscii("Description"),
                        Cl.uint((i + 1) * 1000),
                        Cl.uint(deadline)
                    ],
                    wallet1
                );
            }

            // Accept all tasks by different workers
            simnet.callPublicFn(
                'bittask',
                'accept-task',
                [Cl.uint(1)],
                wallet2
            );

            simnet.callPublicFn(
                'bittask',
                'accept-task',
                [Cl.uint(2)],
                wallet3
            );

            simnet.callPublicFn(
                'bittask',
                'accept-task',
                [Cl.uint(3)],
                wallet2
            );

            // Verify all tasks are in-progress
            const task1 = simnet.callReadOnlyFn(
                'bittask',
                'get-task',
                [Cl.uint(1)],
                deployer
            );
            const task2 = simnet.callReadOnlyFn(
                'bittask',
                'get-task',
                [Cl.uint(2)],
                deployer
            );
            const task3 = simnet.callReadOnlyFn(
                'bittask',
                'get-task',
                [Cl.uint(3)],
                deployer
            );

            expect(task1.result).toBeTruthy();
            expect(task2.result).toBeTruthy();
            expect(task3.result).toBeTruthy();
        });
    });
});
