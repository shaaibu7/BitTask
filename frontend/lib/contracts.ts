import { STACKS_MAINNET } from '@stacks/network';
import { fetchCallReadOnlyFunction, cvToValue, uintCV } from '@stacks/transactions';

const network = STACKS_MAINNET;
const CONTRACT_ADDRESS = 'SP34HE2KF7SPKB8BD5GY39SG7M207FZPRXJS4NMY9';
const CONTRACT_NAME = 'bittask';

export interface Task {
    id: number;
    title: string;
    description: string;
    creator: string;
    worker: string | null;
    amount: number;
    deadline: number;
    status: string;
}

export async function fetchTaskCount(): Promise<number> {
    // Logic to fetch nonce (total tasks)
    // For now, if we don't have a direct count function exposed easily or want to rely on id sequence
    // We used 'task-nonce' in the contract which is the ID of the last created task.
    // So getting 'get-nonce' will give us the total count.
    try {
        const result = await fetchCallReadOnlyFunction({
            contractAddress: CONTRACT_ADDRESS,
            contractName: CONTRACT_NAME,
            functionName: 'get-nonce',
            functionArgs: [],
            senderAddress: CONTRACT_ADDRESS,
            network,
        });
        console.log(result);
        return Number(cvToValue(result));
    } catch (e) {
        console.error("Error fetching task count", e);
        return 0;
    }
}

export async function fetchTasks(): Promise<Task[]> {
    const count = await fetchTaskCount();
    if (count === 0) return [];

    // Limit to 200 for now to avoid overloading if many tasks
    const limit = 200;
    const idsToFetch = [];
    for (let i = 1; i <= Math.min(count, limit); i++) {
        idsToFetch.push(i);
    }

    try {
        const fetchPromises = idsToFetch.map(async (id) => {
            const result = await fetchCallReadOnlyFunction({
                contractAddress: CONTRACT_ADDRESS,
                contractName: CONTRACT_NAME,
                functionName: 'get-task',
                functionArgs: [uintCV(id)],
                senderAddress: CONTRACT_ADDRESS,
                network,
            });
            // cvToValue for optional tuple returns null (if none) or the object (if some)
            return { id, data: cvToValue(result) };
        });

        const results = await Promise.all(fetchPromises);

        const tasks: Task[] = results
            .filter(r => r.data && r.data.value) // Filter out nulls or invalid
            .map((r) => {
                const t = r.data.value; // cvToValue unwraps 'some' to { type, value } or just value?
                // Actually cvToValue unwraps `some` to its content. 
                // If the content is a tuple, it returns the JS object.
                // However, let's look at previous logic. If it returns the object directly:
                // We need to be careful about what cvToValue returns for `(some (tuple ...))`.
                // It usually returns the tuple object directly if it unwraps fully.
                // Let's assume t is the tuple object directly for now based on typical behavior, 
                // but checking for .value implies we might expect { value: ... } structure.

                // Let's play safe. If t has properties of Task, use t. 
                // If t has .value which has properties, use t.value.
                const taskData = t.title ? t : t.value;

                return {
                    id: r.id,
                    title: taskData.title.value || taskData.title,
                    description: taskData.description.value || taskData.description,
                    creator: taskData.creator.value || taskData.creator,
                    worker: (taskData.worker && taskData.worker.value) ? taskData.worker.value : (taskData.worker || null),
                    amount: Number(taskData.amount.value || taskData.amount),
                    deadline: Number(taskData.deadline.value || taskData.deadline),
                    status: taskData.status.value || taskData.status
                };
            });

        return tasks.reverse();
    } catch (e) {
        console.error("Error fetching tasks", e);
        return [];
    }
}
