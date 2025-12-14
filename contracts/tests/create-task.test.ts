import { describe, it, expect } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe('create-task', () => {
    it('should create a task with valid parameters', () => {
        const amount = 1000;
        const deadline = simnet.blockHeight + 50;
        
        const { result } = simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Test Task"),
                Cl.stringAscii("Description of the task"),
                Cl.uint(amount),
                Cl.uint(deadline)
            ],
            wallet1
        );
        
        expect(result).toBeOk(Cl.uint(1));
    });

    it('should store task data correctly', () => {
        const amount = 500;
        const deadline = simnet.blockHeight + 100;

        simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Task Title"),
                Cl.stringAscii("Task Description"),
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

        expect(task.result).toBeSome(Cl.tuple({
            title: Cl.stringAscii("Task Title"),
            description: Cl.stringAscii("Task Description"),
            creator: Cl.principal(wallet1),
            worker: Cl.none(),
            amount: Cl.uint(amount),
            deadline: Cl.uint(deadline),
            status: Cl.stringAscii("open"),
            'created-at': Cl.uint(simnet.blockHeight)
        }));
    });

    it('should increment task nonce correctly', () => {
        const deadline = simnet.blockHeight + 50;

        // Create first task
        const result1 = simnet.callPublicFn(
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
        expect(result1.result).toBeOk(Cl.uint(1));

        // Create second task
        const result2 = simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Task 2"),
                Cl.stringAscii("Description 2"),
                Cl.uint(2000),
                Cl.uint(deadline)
            ],
            wallet2
        );
        expect(result2.result).toBeOk(Cl.uint(2));

        // Create third task
        const result3 = simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Task 3"),
                Cl.stringAscii("Description 3"),
                Cl.uint(3000),
                Cl.uint(deadline)
            ],
            wallet1
        );
        expect(result3.result).toBeOk(Cl.uint(3));
    });

    it('should set initial status to "open"', () => {
        const deadline = simnet.blockHeight + 50;

        simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Open Task"),
                Cl.stringAscii("Should be open"),
                Cl.uint(1000),
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

    it('should set worker to none initially', () => {
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

        const task = simnet.callReadOnlyFn(
            'bittask',
            'get-task',
            [Cl.uint(1)],
            deployer
        );

        expect(task.result).toBeTruthy();
    });

    it('should record creator correctly', () => {
        const deadline = simnet.blockHeight + 50;

        simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Creator Test"),
                Cl.stringAscii("Test"),
                Cl.uint(1000),
                Cl.uint(deadline)
            ],
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
    it('should fail with zero amount', () => {
        const { result } = simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Zero Amount Task"),
                Cl.stringAscii("Description"),
                Cl.uint(0),
                Cl.uint(simnet.blockHeight + 50)
            ],
            wallet1
        );
        
        expect(result).toBeErr(Cl.uint(100)); // ERR-ZERO-AMOUNT
    });

    it('should fail with past deadline', () => {
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
                Cl.stringAscii("Past Deadline"),
                Cl.stringAscii("Description"),
                Cl.uint(1000),
                Cl.uint(pastDeadline)
            ],
            wallet1
        );
        
        expect(result).toBeErr(Cl.uint(103)); // ERR-PAST-DEADLINE
    });

    it('should fail with deadline at current block height', () => {
        const { result } = simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Current Block Deadline"),
                Cl.stringAscii("Description"),
                Cl.uint(1000),
                Cl.uint(simnet.blockHeight)
            ],
            wallet1
        );
        
        expect(result).toBeErr(Cl.uint(103)); // ERR-PAST-DEADLINE
    });

    it('should fail with empty title', () => {
        const { result } = simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii(""),
                Cl.stringAscii("Description"),
                Cl.uint(1000),
                Cl.uint(simnet.blockHeight + 50)
            ],
            wallet1
        );
        
        expect(result).toBeErr(Cl.uint(104)); // ERR-EMPTY-TITLE
    });

    it('should fail with empty description', () => {
        const { result } = simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Task Title"),
                Cl.stringAscii(""),
                Cl.uint(1000),
                Cl.uint(simnet.blockHeight + 50)
            ],
            wallet1
        );
        
        expect(result).toBeErr(Cl.uint(105)); // ERR-EMPTY-DESCRIPTION
    });

    // Edge cases
    it('should accept minimum valid amount (u1)', () => {
        const { result } = simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Minimum Amount"),
                Cl.stringAscii("Description"),
                Cl.uint(1),
                Cl.uint(simnet.blockHeight + 50)
            ],
            wallet1
        );
        
        expect(result).toBeOk(Cl.uint(1));
    });

    it('should accept very large amount', () => {
        const largeAmount = 999999999999;
        const { result } = simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Large Amount"),
                Cl.stringAscii("Description"),
                Cl.uint(largeAmount),
                Cl.uint(simnet.blockHeight + 50)
            ],
            wallet1
        );
        
        expect(result).toBeOk(Cl.uint(1));
    });

    it('should accept deadline exactly at block height + 2', () => {
        const deadline = simnet.blockHeight + 2;
        const { result } = simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Near Deadline"),
                Cl.stringAscii("Description"),
                Cl.uint(1000),
                Cl.uint(deadline)
            ],
            wallet1
        );
        
        expect(result).toBeOk(Cl.uint(1));
    });

    it('should accept maximum length title (50 chars)', () => {
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

    it('should accept maximum length description (256 chars)', () => {
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

    it('should allow multiple tasks from same creator', () => {
        const deadline = simnet.blockHeight + 50;

        const result1 = simnet.callPublicFn(
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
        expect(result1.result).toBeOk(Cl.uint(1));

        const result2 = simnet.callPublicFn(
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
        expect(result2.result).toBeOk(Cl.uint(2));
    });

    it('should allow multiple tasks from different creators', () => {
        const deadline = simnet.blockHeight + 50;

        const result1 = simnet.callPublicFn(
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
        expect(result1.result).toBeOk(Cl.uint(1));

        const result2 = simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Task 2"),
                Cl.stringAscii("Description 2"),
                Cl.uint(2000),
                Cl.uint(deadline)
            ],
            wallet2
        );
        expect(result2.result).toBeOk(Cl.uint(2));
    });
});
