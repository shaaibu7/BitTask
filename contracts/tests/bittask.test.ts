
import { describe, it, expect } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;

describe('bittask contract', () => {
    it('ensure that user can create a task', () => {
        const amount = 1000;
        const deadline = 50;
        const { result } = simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Test Task"),
                Cl.stringAscii("Description of the task"),
                Cl.uint(amount),
                Cl.uint(simnet.blockHeight + 50)
            ],
            wallet1
        );
        expect(result).toBeOk(Cl.uint(1));
    });

    it('ensure that task creation fails with zero amount', () => {
        const amount = 0;
        const { result } = simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Test Task"),
                Cl.stringAscii("Description of the task"),
                Cl.uint(amount),
                Cl.uint(simnet.blockHeight + 50)
            ],
            wallet1
        );
        expect(result).toBeErr(Cl.uint(100)); // ERR-ZERO-AMOUNT
    });

    it('ensure that task creation fails with past deadline', () => {
        const amount = 1000;
        const { result } = simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Test Task"),
                Cl.stringAscii("Description"),
                Cl.uint(amount),
                Cl.uint(simnet.blockHeight)
            ],
            wallet1
        );
        expect(result).toBeErr(Cl.uint(103)); // ERR-PAST-DEADLINE
    });

    it('ensure that task data is stored correctly', () => {
        const amount = 500;
        const deadline = simnet.blockHeight + 100;

        simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Task 2"),
                Cl.stringAscii("Desc 2"),
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
            title: Cl.stringAscii("Task 2"),
            description: Cl.stringAscii("Desc 2"),
            creator: Cl.principal(wallet1),
            worker: Cl.none(),
            amount: Cl.uint(amount),
            deadline: Cl.uint(deadline),
            status: Cl.stringAscii("open"),
            submission: Cl.none(),
            'created-at': Cl.uint(simnet.blockHeight)
        }));
    });

    it('ensure that a user can accept and submit a task', () => {
        const amount = 1000;
        const deadline = simnet.blockHeight + 100;
        const worker = accounts.get("wallet_2")!;

        // Create task
        simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Task 3"),
                Cl.stringAscii("Desc 3"),
                Cl.uint(amount),
                Cl.uint(deadline)
            ],
            wallet1
        );
        const creationHeight = simnet.blockHeight;

        const taskId = Cl.uint(1); // Assuming nonce resets or is 1 for this test case

        // Accept task
        const acceptResult = simnet.callPublicFn(
            'bittask',
            'accept-task',
            [taskId],
            worker
        );
        expect(acceptResult.result).toBeOk(Cl.bool(true));

        // Verify status is in-progress
        let task = simnet.callReadOnlyFn('bittask', 'get-task', [taskId], deployer);
        expect(task.result).toBeSome(Cl.tuple({
            title: Cl.stringAscii("Task 3"),
            description: Cl.stringAscii("Desc 3"),
            creator: Cl.principal(wallet1),
            worker: Cl.some(Cl.principal(worker)),
            amount: Cl.uint(amount),
            deadline: Cl.uint(deadline),
            status: Cl.stringAscii("in-progress"),
            submission: Cl.none(),
            'created-at': Cl.uint(creationHeight)
        }));

        // Submit work
        const submission = "https://github.com/my-pr";
        const submitResult = simnet.callPublicFn(
            'bittask',
            'submit-work',
            [taskId, Cl.stringAscii(submission)],
            worker
        );
        expect(submitResult.result).toBeOk(Cl.bool(true));

        // Verify status is submitted
        task = simnet.callReadOnlyFn('bittask', 'get-task', [taskId], deployer);
        expect(task.result).toBeSome(Cl.tuple({
            title: Cl.stringAscii("Task 3"),
            description: Cl.stringAscii("Desc 3"),
            creator: Cl.principal(wallet1),
            worker: Cl.some(Cl.principal(worker)),
            amount: Cl.uint(amount),
            deadline: Cl.uint(deadline),
            status: Cl.stringAscii("submitted"),
            submission: Cl.some(Cl.stringAscii(submission)),
            'created-at': Cl.uint(creationHeight)
        }));
    });

    it('ensure that get-tasks returns multiple tasks', () => {
        const amount = 500;
        const deadline = simnet.blockHeight + 100;

        // Create Task 1
        simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Task 1"),
                Cl.stringAscii("Desc 1"),
                Cl.uint(amount),
                Cl.uint(deadline)
            ],
            wallet1
        );
        const height1 = simnet.blockHeight;

        // Create Task 2
        simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Task 2"),
                Cl.stringAscii("Desc 2"),
                Cl.uint(amount),
                Cl.uint(deadline)
            ],
            wallet1
        );
        const height2 = simnet.blockHeight;

        // Fetch both tasks and a non-existent one
        const tasks = simnet.callReadOnlyFn(
            'bittask',
            'get-tasks',
            [Cl.list([Cl.uint(1), Cl.uint(2), Cl.uint(99)])], // 99 does not exist
            deployer
        );

        const expectedTask1 = Cl.tuple({
            title: Cl.stringAscii("Task 1"),
            description: Cl.stringAscii("Desc 1"),
            creator: Cl.principal(wallet1),
            worker: Cl.none(),
            amount: Cl.uint(amount),
            deadline: Cl.uint(deadline),
            status: Cl.stringAscii("open"),
            submission: Cl.none(),
            'created-at': Cl.uint(height1)
        });

        const expectedTask2 = Cl.tuple({
            title: Cl.stringAscii("Task 2"),
            description: Cl.stringAscii("Desc 2"),
            creator: Cl.principal(wallet1),
            worker: Cl.none(),
            amount: Cl.uint(amount),
            deadline: Cl.uint(deadline),
            status: Cl.stringAscii("open"),
            submission: Cl.none(),
            'created-at': Cl.uint(height2)
        });

        // Expect list of 3 items: Some(Task1), Some(Task2), None
        expect(tasks.result).toBeList([
            Cl.some(expectedTask1),
            Cl.some(expectedTask2),
            Cl.none()
        ]);
    });

    it('ensure that a worker can accept a task', () => {
        const amount = 500;
        const deadline = simnet.blockHeight + 100;
        const user2 = accounts.get("wallet_2")!;

        // Create Task
        const createResult = simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Task to Accept"),
                Cl.stringAscii("Description"),
                Cl.uint(amount),
                Cl.uint(deadline)
            ],
            wallet1
        );
        // Capture the ID (expected to be 1 since state resets)
        // Note: For robustness we could parse it, but assuming 1 is fine given observations. 
        // Let's assume 1 for now as per logs.

        // Capture block height at creation time
        const createdBlockHeight = simnet.blockHeight;

        // Accept Task
        const result = simnet.callPublicFn(
            'bittask',
            'accept-task',
            [Cl.uint(1)],
            user2
        );
        expect(result.result).toBeOk(Cl.bool(true));

        // Verify Task Status
        const task = simnet.callReadOnlyFn(
            'bittask',
            'get-task',
            [Cl.uint(1)],
            deployer
        );

        expect(task.result).toBeSome(Cl.tuple({
            title: Cl.stringAscii("Task to Accept"),
            description: Cl.stringAscii("Description"),
            creator: Cl.principal(wallet1),
            worker: Cl.some(Cl.principal(user2)),
            amount: Cl.uint(amount),
            deadline: Cl.uint(deadline),
            status: Cl.stringAscii("in-progress"),
            submission: Cl.none(),
            'created-at': Cl.uint(createdBlockHeight)
        }));
    });

    it('ensure that creator cannot accept their own task', () => {
        const amount = 500;
        const deadline = simnet.blockHeight + 100;

        // Create Task
        simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Self Accept Task"),
                Cl.stringAscii("Description"),
                Cl.uint(amount),
                Cl.uint(deadline)
            ],
            wallet1
        );

        // Try to Accept Task as Creator
        const result = simnet.callPublicFn(
            'bittask',
            'accept-task',
            [Cl.uint(1)],
            wallet1
        );
        expect(result.result).toBeErr(Cl.uint(106)); // ERR-CREATOR-CANNOT-ACCEPT
    });

    it('ensure that task cannot be accepted if not open', () => {
        const amount = 500;
        const deadline = simnet.blockHeight + 100;
        const user2 = accounts.get("wallet_2")!;
        const user3 = accounts.get("wallet_3")!;

        // Create Task
        simnet.callPublicFn(
            'bittask',
            'create-task',
            [
                Cl.stringAscii("Double Accept Task"),
                Cl.stringAscii("Description"),
                Cl.uint(amount),
                Cl.uint(deadline)
            ],
            wallet1
        );

        // Accept Task (User 2)
        simnet.callPublicFn(
            'bittask',
            'accept-task',
            [Cl.uint(1)],
            user2
        );

        // Try to Accept Task Again (User 3)
        const result = simnet.callPublicFn(
            'bittask',
            'accept-task',
            [Cl.uint(1)],
            user3
        );
        expect(result.result).toBeErr(Cl.uint(107)); // ERR-NOT-OPEN
    });
});
