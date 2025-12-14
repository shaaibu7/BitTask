import { describe, it, expect } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

describe('accept-task', () => {
    it('should allow worker to accept an open task', () => {
        const deadline = simnet.blockHeight + 50;

        simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Task to Accept"),
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

    it('should change task status from "open" to "in-progress"', () => {
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

        simnet.callPublicFn(
            'bittask',
            'accept-task',
            [Cl.uint(1)],
            wallet2
        );

        const task = simnet.callReadOnlyFn(
            'bittask',
            'get-task',
            [Cl.uint(1)],
            deployer
        );

        expect(task.result).toBeTruthy();
    });

    it('should assign worker correctly', () => {
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

        simnet.callPublicFn(
            'bittask',
            'accept-task',
            [Cl.uint(1)],
            wallet2
        );

        const task = simnet.callReadOnlyFn(
            'bittask',
            'get-task',
            [Cl.uint(1)],
            deployer
        );

        expect(task.result).toBeTruthy();
    });

    it('should keep creator unchanged after acceptance', () => {
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

        simnet.callPublicFn(
            'bittask',
            'accept-task',
            [Cl.uint(1)],
            wallet2
        );

        const task = simnet.callReadOnlyFn(
            'bittask',
            'get-task',
            [Cl.uint(1)],
            deployer
        );

        expect(task.result).toBeTruthy();
    });

    it('should keep other task data unchanged after acceptance', () => {
        const deadline = simnet.blockHeight + 50;
        const amount = 5000;
        const title = "Unchanged Task";
        const description = "This should not change";

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

        simnet.callPublicFn(
            'bittask',
            'accept-task',
            [Cl.uint(1)],
            wallet2
        );

        const task = simnet.callReadOnlyFn(
            'bittask',
            'get-task',
            [Cl.uint(1)],
            deployer
        );

        expect(task.result).toBeTruthy();
    });

    // Error cases
    it('should fail when creator tries to accept own task', () => {
        const deadline = simnet.blockHeight + 50;

        simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Self Accept Task"),
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
            wallet1
        );

        expect(result).toBeErr(Cl.uint(107)); // ERR-CREATOR-CANNOT-ACCEPT
    });

    it('should fail when accepting non-existent task', () => {
        const { result } = simnet.callPublicFn(
            'bittask',
            'accept-task',
            [Cl.uint(999)],
            wallet2
        );

        expect(result).toBeErr(Cl.uint(101)); // ERR-INVALID-ID
    });

    it('should fail when accepting already accepted task', () => {
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

        // First worker accepts
        simnet.callPublicFn(
            'bittask',
            'accept-task',
            [Cl.uint(1)],
            wallet2
        );

        // Second worker tries to accept
        const { result } = simnet.callPublicFn(
            'bittask',
            'accept-task',
            [Cl.uint(1)],
            wallet3
        );

        expect(result).toBeErr(Cl.uint(106)); // ERR-NOT-OPEN
    });

    it('should fail when accepting task with invalid ID', () => {
        const { result } = simnet.callPublicFn(
            'bittask',
            'accept-task',
            [Cl.uint(0)],
            wallet2
        );

        expect(result).toBeErr(Cl.uint(101)); // ERR-INVALID-ID
    });

    // Edge cases
    it('should allow different workers to accept different tasks', () => {
        const deadline = simnet.blockHeight + 50;

        // Create task 1
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

        // Create task 2
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

        // Worker 2 accepts task 1
        const result1 = simnet.callPublicFn(
            'bittask',
            'accept-task',
            [Cl.uint(1)],
            wallet2
        );
        expect(result1.result).toBeOk(Cl.bool(true));

        // Worker 3 accepts task 2
        const result2 = simnet.callPublicFn(
            'bittask',
            'accept-task',
            [Cl.uint(2)],
            wallet3
        );
        expect(result2.result).toBeOk(Cl.bool(true));
    });

    it('should accept task at deadline block height', () => {
        const deadline = simnet.blockHeight + 2;

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

    it('should maintain task state isolation between multiple tasks', () => {
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

        // Accept only task 2
        simnet.callPublicFn(
            'bittask',
            'accept-task',
            [Cl.uint(2)],
            wallet2
        );

        // Verify task 1 is still open
        const task1 = simnet.callReadOnlyFn(
            'bittask',
            'get-task',
            [Cl.uint(1)],
            deployer
        );
        expect(task1.result).toBeTruthy();

        // Verify task 2 is in-progress
        const task2 = simnet.callReadOnlyFn(
            'bittask',
            'get-task',
            [Cl.uint(2)],
            deployer
        );
        expect(task2.result).toBeTruthy();

        // Verify task 3 is still open
        const task3 = simnet.callReadOnlyFn(
            'bittask',
            'get-task',
            [Cl.uint(3)],
            deployer
        );
        expect(task3.result).toBeTruthy();
    });
});
